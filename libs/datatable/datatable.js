class DataTable {
  constructor(parentId, data, searchCallback, loadMoreCallback, permission) {
    // parent id is the placeholder (wrapper div) for table
    this.parentId = parentId;
    // this is the function gets called when user type on search input
    this.searchCallback = searchCallback;
    // this is the function gets called when user scroll the table rows
    this.loadMoreCallback = loadMoreCallback;
    // permission used to show hide table columns (binary string)
    this.permission = permission;
    // store id of the currently selected entry
    this.selectedEntryId = null;
    // load initial data to the table
    this.loadTable(data);

    // set event listeners for table operations (such as search and load)
    this.setEventListeners();

    this.applyPermission();
  }

  loadTable(data) {
    // id of the wrapper div around table
    const parentId = this.parentId;

    // get keys in a single object to use as table headings {key: value} 
    const keys = this.getKeys(data);

    // variables for storing headings and rows
    let headings = "", rows = "";

    // if we have at least 1 or more elements
    if (data.length > 0) {

      // generate html for table headings
      keys.forEach(key => {
        if (key == "entryId") return;
        headings += `<th>${key}</th>`;
      });

      // generate html table rows
      rows = this.getRows(data);
    }

    // clear the parent
    $(`#${parentId}`).empty();

    // apend the table
    $(`#${parentId}`).append(`
      <div id="${parentId}-dt-wrapper" style="">
        <div style="margin-bottom: 10px;">
          <button id="${parentId}-dt-btnEdit" onclick="editEntry()" class="btn btn-success dt-action-btn" style="display:none">
            <i class="fa fa-pencil-square-o"></i> 
          </button>
          <button id="${parentId}-dt-btnDelete" onclick="deleteEntry()" class="btn btn-danger dt-action-btn" style="display:none">
            <i class="fa fa-trash-o"></i> 
          </button>
          <div class="float-right widthmd mb-3">
            <input type="text" id="${parentId}-dt-search" class="form-control" placeholder="Search..">
          </div>
        </div>
        <div class="table-responsive">
        <table id="${parentId}-dt-table" class="table table-dark table-borderless customtable data-table">
          <thead class="tablehead">
            <tr>
              ${headings}
            </tr>
          </thead>
          <tbody id="${parentId}-dt-tbody">
              ${rows}
          </tbody>
        </table>
        </div>
      </div>`
    );
  }

  getKeys(data) {
    // get the first object in an array and extract its keys
    return (data.length > 0) ? Object.keys(data[0]) : [];
  }

  getRows(data) {
    const keys = this.getKeys(data);
    let rows = "";
    data.forEach(dataItem => {
      rows += `<tr class="bottomborder dt-row" data-id="${dataItem.entryId}">`;
      keys.forEach(key => {
        // fix when key value is null\
        if (key == "entryId") return;
        dataItem[key] = (dataItem[key] == null) ? "" : dataItem[key];
        rows += `<td>${dataItem[key]}</td>`;
      })
      rows += "</tr>";
    });
    return rows;
  }

  reload(data) {
    // this will reload the table (empty and fill with given data)
    const rows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).empty();
    $(`#${this.parentId}-dt-tbody`).append(rows);

    // add event listener for new rows
    this.registerRowClickEvents();

    // hide top action buttons
    $(`#${this.parentId}-dt-btnEdit`).hide();
    $(`#${this.parentId}-dt-btnDelete`).hide();

    // reset selected entry
    this.selectedEntryId = undefined
  }

  append(data) {
    // this will append new data to the table
    const newRows = this.getRows(data);
    $(`#${this.parentId}-dt-tbody`).append(newRows);
    this.applyPermission();
  }

  setEventListeners() {
    const parentId = this.parentId;

    // clear existing event listeners
    try { $(`#${parentId}-dt-search, #${parentId}-dt-tbody`).off() } catch { }

    // even listneer for search box
    $(`#${parentId}-dt-search`).on("keyup", (event) => {
      this.searchCallback(event.target.value);
    });


    // event listener to detect when user scroll to the end of the table and load more
    $(`#${parentId}-dt-tbody`).scroll((e) => {
      const target = e.target;
      // const isBottom = ($(target).scrollTop() + $(target).innerHeight() + 10 >= $(target)[0].scrollHeight);
      const isBottom = ($(target).scrollTop() + $(target).innerHeight() >= $(target)[0].scrollHeight - 3);

      if (isBottom) {
        this.loadMoreCallback($(`#${parentId}-dt-search`).val(), $(`#${parentId}-dt-tbody tr`).length);
      }
    });

    // event listener for print button
    $(`#${parentId}-dt-print`).click(() => {
      this.print();
    });

    this.registerRowClickEvents();
  }

  registerRowClickEvents() {
    $(`#${this.parentId}-dt-tbody tr`).click((e) => {
      const currentRow = $(e.target).parent();
      if (currentRow.html().indexOf("td") == -1) return;
      if (currentRow.hasClass("dt-row-selected")) {
        currentRow.removeClass("dt-row-selected");
        this.selectedEntryId = undefined;
        $(`#${this.parentId}-dt-btnEdit`).fadeOut();
        $(`#${this.parentId}-dt-btnDelete`).fadeOut();
      } else {
        $(`#${this.parentId}-dt-tbody tr`).removeClass("dt-row-selected");
        currentRow.addClass("dt-row-selected");
        this.selectedEntryId = currentRow.data("id");
        $(`#${this.parentId}-dt-btnEdit`).fadeIn();
        $(`#${this.parentId}-dt-btnDelete`).fadeIn();
      }
    });
  }

  print() {
    const parentId = this.parentId;
    // print rows in the table

    // store button state (to fix issues with permission system)
    let btnEditHidden = false, btnDeleteHidden = false;

    // hide action columns if they are already hidden, then store their state for later
    $(`.dt-View-${parentId}-col`).hide();

    if (!$(`.dt-Edit-${parentId}-col`).is(":hidden")) {
      btnEditHidden = true;
      $(`.dt-Edit-${parentId}-col`).hide();
    }

    if (!$(`.dt-Delete-${parentId}-col`).is(":hidden")) {
      btnDeleteHidden = true;
      $(`.dt-Delete-${parentId}-col`).hide();
    }

    // clone html from the table
    let tableHTML = $("<div>").append($(`#${this.parentId}-dt-table`).clone()).html();

    // create new window and print the table
    const stylesheet = "/lib/bootstrap/css/bootstrap.min.css";
    const win = window.open("", "Print", "width=500,height=300");
    win.document.write(`<html><head><link rel="stylesheet" href="${stylesheet}"></head><body>${tableHTML}</body></html>`);
    setTimeout(() => {
      win.document.close();
      win.print();
      win.close();
    }, 800);

    // show previously hidden buttions based on state
    $(`.dt-View-${parentId}-col`).show();

    if (btnDeleteHidden) {
      $(`.dt-Delete-${parentId}-col`).show();
    }

    if (btnEditHidden) {
      $(`.dt-Edit-${parentId}-col`).show();
    }

    return true;
  }

  // apply permission to table columns
  applyPermission() {
    if (this.permission[2] == 0) {
      this.showEditButton(false);
    }
    if (this.permission[3] == 0) {
      this.showDeleteButton(false);
    }
  }

  showEditButton(isVisible) {
    const parentId = this.parentId;
    if (isVisible) {
      $(`#${parentId}-dt-btnEdit`).show();
    } else {
      $(`#${parentId}-dt-btnEdit`).hide();
    }
  }

  showDeleteButton(isVisible) {
    const parentId = this.parentId;
    if (isVisible) {
      $(`#${parentId}-dt-btnDelete`).show();
    } else {
      $(`#${parentId}-dt-btnDelete`).hide();
    }
  }

  // filter rows for searching
  filterRows(keyword = "") {
    const rows = $(`#${this.parentId}-dt-tbody tr`);

    if (keyword.trim() == "") {
      rows.show();
      return;
    }

    rows.each((i, tr) => {
      if ($(tr).html().indexOf(keyword) > -1) {
        $(tr).show();
      } else {
        $(tr).hide();
      }
    });
  }
}