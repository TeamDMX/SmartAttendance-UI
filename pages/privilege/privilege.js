/*-------------------------------------------------------------------------------------------------------
                                          Window Data
-------------------------------------------------------------------------------------------------------*/
window.tempData = { selectedEntry: undefined, validationInfo: undefined, loadMore: true, permission: undefined };


/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
    await loadFormDropdowns();
    registerEventListeners();

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));

    // show hide buttions based on permission
    if (permission[2] == 0) {
        $("#btnFmUpdate").hide();
    }

    // save permission globally
    tempData.permission = permission;
}


/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {

    // disable from submissions
    $("form").on("submit", (e) => e.preventDefault());

    // register listeners for form buttons

    $("#btnFmUpdate").on("click", updateEntry);
    $("#btnModuleAdd").on("click", () => {
        addToModuleList($("#moduleId").val());
    });

    $("#roleId").on("change", (e) => {
        reloadModuleList(e.target.value);
    });

    // catch promise rejections
    $(window).on("unhandledrejection", (event) => {
        console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
    });
}

const loadFormDropdowns = async () => {
    let response;

    response = await Request.send("/api/general/module", "GET");
    const modules = response.data;

    response = await Request.send("/api/general/role", "GET");
    const roles = response.data;

    $("#roleId").empty();
    $("#moduleId").empty();

    modules.forEach(module => {
        $("#moduleId").append(`<option value="${module.id}">${module.name}</option>`);
    });

    roles.forEach(role => {
        $("#roleId").append(`<option value="${role.id}">${role.name}</option>`);
    });


    editEntry(modules[0].id);
}

const validateForm = async () => {
    let errors = "";
    let entry = {};

    // set id (role id)
    entry.roleId = $("#roleId").val();

    // delete useless property
    delete entry.moduleId;

    // validate module permissions
    const privileges = [

    ];

    $("#moduleTable tbody tr").each((i, tr) => {
        const children = $(tr).children();
        const moduleId = $(children[0]).html();
        const post = $(children[3]).children().first().is(":checked") ? 1 : 0;
        const get = $(children[2]).children().first().is(":checked") ? 1 : 0;
        const put = $(children[4]).children().first().is(":checked") ? 1 : 0;
        const del = $(children[5]).children().first().is(":checked") ? 1 : 0;
        let permission = `${post}${get}${put}${del}`;
        if (permission == "0000") {
            errors += "Please check at least one permission for each module or remove restricted ones.";
            return false;
        }
        privileges.push({
            roleId: entry.roleId,
            moduleId: moduleId,
            permission: permission
        });
    });

    // add permissions for each module to the entry
    entry.privileges = privileges;

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

const editEntry = async (roleId) => {

    // get entry data from db and show in the form
    const response = await Request.send(`/api/roles/${roleId}/privileges`, "GET");
    const entry = response.data;

    // clear the module list in the form
    $("#moduleTable tbody").empty();

    // append each privilege to the module list
    entry.privileges.forEach(p => {
        addToModuleList(p.moduleId, p.permission);
    });

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    if (entry.privileges.length > 0) {
        setFormButtionsVisibility("edit");
    } else {
        setFormButtionsVisibility("add");
    }
}

// update entry in the database
const updateEntry = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    const selectedEntry = tempData.selectedEntry;

    // new entry object
    let newEntryObj = data;

    // check if any of the data in entry has changed
    let dataHasChanged = false;


    // when all permissions are removed
    if ((selectedEntry.privileges.length > 0 && newEntryObj.privileges.length == 0) || selectedEntry.privileges.length == 0) {
        dataHasChanged = true;
    } else {
        selectedEntry.privileges.every((p, index) => {
            if (p.permission !== newEntryObj.privileges[index].permission) {
                dataHasChanged = true;
                return false;
            }
            return true;
        });
    }

    // if nothing has been modifed
    if (!dataHasChanged) {
        mainWindow.showOutputModal("Sorry!.", "You haven't changed anything to update.");
        return;
    }

    // set id of the newEntry object
    newEntryObj.id = tempData.selectedEntry.id;

    // send put reqeust to update data
    const roleId = newEntryObj.roleId;
    const response = await Request.send(`/api/roles/${roleId}/privileges`, "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputModal("Success!", response.msg);
        // reset selected entry
        reloadModuleList($("#roleId").val());
        editEntry(newEntryObj.id);
        tempData.selectedEntry = undefined;
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
            $("#btnFmPrint").hide();
            break;

        case "add":
            if (permission[0] !== 0) $("#btnFmAdd").show();
            $("#btnFmUpdate").hide();
            $("#btnFmDelete").hide();
            $("#btnFmReset").show();
            $("#btnFmPrint").hide();
            break;
    }
}

/*-------------------------------------------------------------------------------------------------------
                                            Module Table
-------------------------------------------------------------------------------------------------------*/

const addToModuleList = (moduleId, permission = "0000") => {
    const moduleName = $(`#moduleId option[value=${moduleId}]`).text();

    // check if module is already in the list
    if ($("#moduleTable tbody").html().indexOf(`${moduleName}`) > -1) {
        window.alert("You can't add same one twice");
        return;
    }

    // permissions and checkbox selections
    let permissions = permission.split("");

    let post, get, put, del;
    post = parseInt(permissions[0]) ? "checked" : "";
    get = parseInt(permissions[1]) ? "checked" : "";
    put = parseInt(permissions[2]) ? "checked" : "";
    del = parseInt(permissions[3]) ? "checked" : "";

    // append module to the list
    $("#moduleTable tbody").append(`
        <tr>
            <td style="display:none">${moduleId}</td>
            <td>${moduleName}</td>
            <td><input type="checkbox" id="${moduleId}read" ${get}></td>
            <td><input type="checkbox" id="${moduleId}add" ${post}></td>
            <td><input type="checkbox" id="${moduleId}modify" ${put}></td>
            <td><input type="checkbox" id="${moduleId}remove" ${del}></td>
            <td>
            <buttn onClick="removeFromModuleList(this)" class="btn btn-danger btn-xs">Delete</buttn>
            </td>  
        </tr>
    `);
}

const removeFromModuleList = (button) => {
    $(button).parent().parent().remove();
}

const reloadModuleList = (roleId) => {
    editEntry(roleId);
}