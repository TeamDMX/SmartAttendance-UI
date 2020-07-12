/*-------------------------------------------------------------------------------------------------------
                                          Window Data
-------------------------------------------------------------------------------------------------------*/
window.tempData = { selectedEntry: undefined, validationInfo: undefined, loadMore: true, permission: null, profile: null };

// main endpoint used for requests
tempData.mainEndPoint = "/api/lecturers";

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
    // get regexes for validation and store on window tempData
    const response = await Request.send("/api/regexes/LECTURER_COURSE");


    // save validation info (regexes) on global tempData
    tempData.validationInfo = response.data;

    // send profile globally
    tempData.profile = mainWindow.tempData.profile;

    await loadFormDropdowns();
    registerEventListeners();
    FormUtil.enableRealtimeValidation(tempData.validationInfo);


    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));

    // show hide buttions based on permission
    if (permission[0] == 0) {
        $("#btnFmAdd").hide();
    }

    if (permission[2] == 0) {
        $("#btnFmUpdate").hide();
    }

    if (permission[3] == 0) {
        $("#btnFmDelete").hide();
    }

    // save permission globally
    tempData.permission = permission;


    await loadMainTable();

    // load date timepicker
    $("#startDatetime").datetimepicker();
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
    const lecturerId = tempData.profile.lecturer.id;
    const courseId = $("#tableCourseId").val();

    // get initial entries from the server
    let response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/courses/${courseId}/lectures/search/ /skip/0`, "GET");


    // convert response data to data table format
    return getTableData(response.data);
}

// search function disabled until backed query builder issue is resolved
const searchEntries = async (searchValue, rowsCount) => {
    const lecturerId = tempData.profile.lecturer.id;
    const courseId = $("#tableCourseId").val();

    if (searchValue.trim() == "") searchValue = " "

    const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/courses/${courseId}/lectures/search/${searchValue}/skip/${rowsCount}`, "GET");

    const tableData = getTableData(response.data);

    // load data to global main table
    mainTable.reload(tableData);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

    // check if all data has been loaded
    if (!tempData.loadMore) return;

    if (searchValue.trim() == "") searchValue = " ";

    const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/courses/${courseId}/lectures/search/ /skip/${rowsCount}`, "GET");

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
            "entryId": entry.id,
            "Code": entry.code,
            "Leclure Hall": entry.lectureHall.name,
            "At": moment(entry.startDatetime).format("YYYY/MM/DD HH:mm"),
            "Lecture Status": entry.lectureStatus.name,
            "Action": entry.lectureStatus.name.toLowerCase() == "pending" ? `<button class="btn btn-primary btn-sm" onclick="startMarking('${entry.id}')">Start Marking</button>` : "-"
        }
    });
}

const loadCourseLectures = async () => {
    $("#loadMainTable").empty();
    loadMainTable();
}

const startMarking = async (lectureId) => {
    const lecturerId = tempData.profile.lecturer.id;
    const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/lectures/${lectureId}/check`, "GET");

    if (response.status == true) {
        window.location = `./view_qr.html?lectureId=${lectureId}&lecturerId=${lecturerId}`
    }
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
    $("#btnFmDelete").on("click", () => deleteEntry(tempData.selectedEntry.id));
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

    // course dropdown
    $("#tableCourseId").on("change", function () {
        loadCourseLectures();
    });
}

const loadFormDropdowns = async () => {
    const lecturerId = tempData.profile.lecturer.id;
    // get courses
    let response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/courses`);
    const lecturerCourses = response.data;

    // get lecture halls
    response = await Request.send(`/api/general/lecture_hall`);
    const lectureHalls = response.data;

    // get lecture status
    response = await Request.send(`/api/general/lecture_status`);
    const lectureStatus = response.data;

    $("#tableCourseId").empty();
    $("#courseId").empty();
    $("#lectureHallId").empty();
    $("#lectureStatusId").empty();

    // populate select inputs with data
    lecturerCourses.forEach(lc => {
        const course = lc.course;
        $("#tableCourseId").append(`<option value="${course.id}">${course.code} - ${course.name}</option>`);
        $("#courseId").append(`<option value="${course.id}">${course.code} - ${course.name}</option>`);
    });

    lectureHalls.forEach(lh => {
        $("#lectureHallId").append(`<option value="${lh.id}">${lh.code} - ${lh.name}</option>`);
    });

    lectureStatus.forEach(ls => {
        $("#lectureStatusId").append(`<option value="${ls.id}">${ls.name}</option>`);
    });

}

const validateForm = async () => {
    let errors = "";
    const entry = {};

    // Loop through validation info items (vi) and check it's value using regexes
    for (let vi of tempData.validationInfo) {
        // element id is equal to database attribute name
        const elementId = vi.attribute;

        // ignore ids
        if (elementId == "id") continue;

        // validation status of the form
        let isValid = FormUtil.validateElementValue(vi);

        // check for errors and add to entry object
        if (!isValid) {
            errors += `${vi.error}<br/>`
        } else {
            let value = $(`#${elementId}`).val();
            entry[elementId] = Array.isArray(value) ? value.toString() : value;
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

    const lecturerId = tempData.profile.lecturer.id;

    // change date time to iso string
    // data.startDatetime = new Date(data.startDatetime).toISOString();

    // get response
    const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/lectures`, "POST", { data: data });

    // // show output modal based on response
    if (response.status) {
        mainWindow.showOutputModal("Success!", response.msg);
        reloadModule();
    }
}

const editEntry = async (id = mainTable.selectedEntryId) => {
    const lecturerId = tempData.profile.lecturer.id;

    // get entry data from db and show in the form
    const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/lectures/${id}`);

    const entry = response.data;

    // change tab to form
    $(".nav-tabs a[href='#tabForm']").tab("show");

    // set entry object globally to later compare
    window.tempData.selectedEntry = entry;

    // fill form inputs
    $("#code").val(entry.code);
    $("#startDatetime").val(moment(entry.startDatetime).format("YYYY/MM/DD HH:mm"));

    $("#tabUpdate").show();
    $("#tabUpdate").tab("show");

    // select dropdown values
    FormUtil.selectDropdownOptionByValue("courseId", entry.courseId);
    FormUtil.selectDropdownOptionByValue("lectureHallId", entry.lectureHallId);
    FormUtil.selectDropdownOptionByValue("lectureStatusId", entry.lectureStatusId);

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
    newEntryObj.lecturerId = tempData.selectedEntry.lecturerId;

    // send put reqeust to update data
    const response = await Request.send(`${tempData.mainEndPoint}/${newEntryObj.lecturerId}/lectures/${newEntryObj.id}`, "PUT", { data: newEntryObj });

    // show output modal based on response
    if (response.status) {
        mainWindow.showOutputModal("Success!", response.msg);
        // reset selected entry
        tempData.selectedEntry = undefined;
        reloadModule();
    }
}

// delete entry from the database
const deleteEntry = async (id = mainTable.selectedEntryId) => {
    const confirmation = window.confirm("Do you really need to delete this entry?");

    const lecturerId = tempData.profile.lecturer.id;

    if (confirmation) {
        const response = await Request.send(`${tempData.mainEndPoint}/${lecturerId}/lectures/${id}`, "DELETE");
        if (response.status) {
            mainWindow.showOutputModal("Success!", response.msg);
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
    $("*").removeClass("is-valid");
    $("*").removeClass("is-invalid");
}