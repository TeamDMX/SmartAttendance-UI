/*-------------------------------------------------------------------------------------------------------
                                          Window Data
-------------------------------------------------------------------------------------------------------*/
window.tempData = { selectedEntry: undefined, validationInfo: undefined, loadMore: true, permission: "1111" };

// main endpoint used for requests
tempData.mainEndPoint = "/api/courses";

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/
$(document).ready(() => {
    loadModule()
});

async function loadModule() {
    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes", "GET", {
        data: { module: "COURSE" }
    });


    // save validation info (regexes) on global tempData
    tempData.validationInfo = response.data;


    registerEventListeners();
    FormUtil.enableRealtimeValidation(tempData.validationInfo);


    // // create an array from permission string
    // const permission = permissionStr.split("").map((p) => parseInt(p));

    // // show hide buttions based on permission
    // if (permission[0] == 0) {
    //     $("#btnFmAdd").hide();
    // }
    // if (permission[2] == 0) {
    //     $("#btnFmUpdate").hide();
    // }
    // if (permission[3] == 0) {
    //     $("#btnFmDelete").hide();
    // }

    // // save permission globally
    // tempData.permission = permission;

    await loadMainTable();
}

// reload main table data and from after making a change
const reloadModule = async () => {
    resetForm();
    const tableData = await getInitialTableData();
    mainTable.reload(tableData);

    // fix for additional load more requests
    setTimeout(() => tempData.loadMore = true, 500);
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Table
-------------------------------------------------------------------------------------------------------*/
const loadMainTable = async () => {
    const tableData = await getInitialTableData();
    // load data table
    window.mainTable = new DataTable("mainTableHolder", tableData, searchEntries, loadMoreEntries, tempData.permission);
}

const getInitialTableData = async () => {
    // get initial entries from the server
    const response = await Request.send(tempData.mainEndPoint, "GET");

    // convert response data to data table format
    return getTableData(response.data);
}

const searchEntries = async (searchValue) => {
    const response = await Request.send(tempData.mainEndPoint, "GET", {
        data: { keyword: searchValue }
    });

    const tableData = getTableData(response.data);

    // load data to global main table
    mainTable.reload(tableData);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

    // check if all data has been loaded
    if (!tempData.loadMore) return;

    const response = await Request.send(tempData.mainEndPoint, "GET", {
        data: { keyword: searchValue, skip: rowsCount }
    });

    // if results came empty (all loaded)
    if (response.data.length == 0) {
        tempData.loadMore = false;
        return;
    }

    const tableData = getTableData(response.data);

    // append to global main table
    mainTable.append(tableData);
}

const tableTabClick = async () => {
    // hide update tab
    $("#tabUpdate").hide();
}

const formTabClick = async () => {
    // when form tab is clicked, reset the form 
    resetForm();

    // show / hide proper button
    setFormButtionsVisibility("add");

    // hide update tab
    $("#tabUpdate").hide();
}

const getTableData = (responseData) => {
    // parse resposne data and return in data table frendly format
    return responseData.map(entry => {
        return {
            "Code": entry.code,
            "Course Name": entry.name,
            "Actions": `
                        <button onclick="editEntry('${entry.id}')" class="btn btn-success custombtn">
                            <i class="fa fa-pencil-square-o"></i>
                        </button>
                        <button onclick="deleteEntry('${entry.id}')" class="btn btn-danger custombtn"> 
                            <i class="fa fa-trash-o"></i>
                        </button>
                        `
        }
    });
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {

    // disable from submissions
    $("form").on("submit", (e) => e.preventDefault());

    // register listeners for form buttons
    $("#btnFmAdd").on("click", addEntry);
    $("#btnFmUpdate").on("click", updateEntry);
    $("#btnFmDelete").on("click", () => deleteEntry());
    $("#btnFmReset").on("click", resetForm);
    $("#btnFmPrint").on("click", () => FormUtil.print());

    //  register listeners for form tab click
    $(".nav-tabs a[href='#tabForm']").on("click", formTabClick);
    $(".nav-tabs a[href='#tabTable']").on("click", tableTabClick);

    // event listeners for top action buttons
    $("#btnTopAddEntry").on("click", () => {
        $(".nav-tabs a[href='#tabForm']").click();
    });

    $("#btnTopViewEntry").on("click", () => {
        $(".nav-tabs a[href='#tabTable']").click();
    });

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
}

const validateForm = async () => {
    let errors = "";
    const entry = {};

    // Loop through validation info items (vi) and check it's value using regexes
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute name
        const elementId = vi.attribute;

        // validation status of the form
        let isValid = FormUtil.validateElementValue(vi);

        // check for errors and add to entry object
        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            entry[elementId] = $(`#${elementId}`).val();
        }
    }

    // if there aren't any errors
    if (errors == "") {
        return {
            status: true,
            data: entry
        }
    }

    // if there are errors
    return {
        status: false,
        data: errors
    };
}

// add new entry to the database
const addEntry = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const response = await Request.send(tempData.mainEndPoint, "POST", { data: data });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        reloadModule();
    }
}

const editEntry = async (id) => {
    // get entry data from db and show in the form
    const response = await Request.send(tempData.mainEndPoint, "GET", { data: { id: id } });
    const entry = response.data;

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    // fill form inputs
    $("#name").val(entry.name);
    $("#code").val(entry.code);

    $("#tabUpdate").show();
    $("#tabUpdate").tab("show");

    // show buttons
    setFormButtionsVisibility("edit");
}

// update entry in the database
const updateEntry = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // new entry object
    let newEntryObj = data;

    // check if any of the data in entry has changed
    let dataHasChanged = false;

    for (let key in newEntryObj) {
        // compare selected entry and edited entry values
        try {
            tempData.selectedEntry[key] = (tempData.selectedEntry[key] == null) ? "" : tempData.selectedEntry[key];
            if (newEntryObj[key] !== tempData.selectedEntry[key].toString()) {
                dataHasChanged = true;
            }
        } catch (error) {
            console.log(key, error);
        }
    }

    // if nothing has been modifed
    if (!dataHasChanged) {
        mainWindow.showOutputModal("Sorry!.", "You haven't changed anything to update.");
        return;
    }

    // set id of the newEntry object
    newEntryObj.id = tempData.selectedEntry.id;

    // send put reqeust to update data
    const response = await Request.send(tempData.mainEndPoint, "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputToast("Success!", response.msg);
        // reset selected entry
        tempData.selectedEntry = undefined;
        reloadModule();
    }
}

// delete entry from the database
const deleteEntry = async (id = tempData.selectedEntry.id) => {
    const confirmation = await mainWindow.showConfirmModal("Confirmation", "Do you really need to delete this entry?");

    if (confirmation) {
        const response = await Request.send(tempData.mainEndPoint, "DELETE", { data: { id: id } });
        if (response.status) {
            mainWindow.showOutputToast("Success!", response.msg);
            tempData.selectedEntry = undefined
            reloadModule();
        }
    }
}

const setFormButtionsVisibility = (action) => {
    let permission = tempData.permission;

    switch (action) {
        case "edit":
            $("#btnFmAdd").hide();
            if (permission[2] !== 0) $("#btnFmUpdate").show();
            if (permission[3] !== 0) $("#btnFmDelete").show();
            $("#btnFmReset").show();
            break;

        case "add":
            if (permission[0] !== 0) $("#btnFmAdd").show();
            $("#btnFmUpdate").hide();
            $("#btnFmDelete").hide();
            $("#btnFmReset").show();
            break;
    }
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $(".form-group").removeClass("is-valid");
    $(".form-group").removeClass("is-invalid");
}