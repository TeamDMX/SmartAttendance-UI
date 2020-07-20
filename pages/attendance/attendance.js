/*-------------------------------------------------------------------------------------------------------
                                          Window Data
-------------------------------------------------------------------------------------------------------*/
window.tempData = { selectedEntry: undefined, validationInfo: undefined, loadMore: true, permission: null, profile: null };

// main endpoint used for requests
tempData.mainEndPoint = "/api/students";

/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {

    // save validation info (regexes) on global tempData
    tempData.validationInfo = [
        {
            regex: "^[\\d]+$",
            attribute: "courseId",
            error: "Please provide a valid course id!."
        },
        {
            regex: "^[A-Z]{2}[\\d]{5}$",
            attribute: "regNumber",
            error: "Please provide a valid student registration number!."
        }
    ];

    // send profile globally
    tempData.profile = mainWindow.tempData.profile;

    await loadFormDropdowns();

    registerEventListeners();
    FormUtil.enableRealtimeValidation(tempData.validationInfo);

    // create an array from permission string
    const permission = permissionStr.split("").map((p) => parseInt(p));

    // save permission globally
    tempData.permission = permission;
}

// reload main table data and from after making a change
const reloadModule = async () => {
    resetForm();
    const tableData = await getInitialTableData();
    historyTable.reload(tableData);

    // fix for additional load more requests
    setTimeout(() => tempData.loadMore = true, 500);
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Table
-------------------------------------------------------------------------------------------------------*/
const loadHistoryTable = (tableData) => {
    // load data table
    window.historyTable = new DataTable("historyTableHolder", tableData, searchEntries, loadMoreEntries, tempData.permission);
}

// search function disabled until backed query builder issue is resolved
const searchEntries = async (searchValue, rowsCount) => {
    historyTable.filterRows(searchValue);
}

const loadMoreEntries = async (searchValue, rowsCount) => {

}

const getTableData = (responseData) => {
    // parse resposne data and return in data table frendly format    
    return responseData.map(entry => {
        return {
            "Marked Date": moment(entry.markedDatetime).format("YYYY/MM/DD"),
            "Marked Time": moment(entry.markedDatetime).format("HH:mm"),
        }
    });
}

/*-------------------------------------------------------------------------------------------------------
                                            Main Form
-------------------------------------------------------------------------------------------------------*/

const registerEventListeners = () => {

    // disable from submissions
    $("form").on("submit", (e) => e.preventDefault());

    $("#btnShowAttendance").on("click", showAttendance);
}

const loadFormDropdowns = async () => {
    const lecturerId = tempData.profile.lecturer.id;
    // get courses
    let response = await Request.send(`/api/lecturers/${lecturerId}/courses`);
    const lecturerCourses = response.data;

    $("#courseId").empty();

    // populate select inputs with data
    lecturerCourses.forEach(lc => {
        const course = lc.course;
        $("#tableCourseId").append(`<option value="${course.id}">${course.code} - ${course.name}</option>`);
        $("#courseId").append(`<option value="${course.id}">${course.code} - ${course.name}</option>`);
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


const showAttendance = async () => {
    const { status, data } = await validateForm();

    // if there are errors
    if (!status) {
        mainWindow.showOutputModal("Sorry!. Please fix these errors.", data);
        return;
    }

    // get response
    const response = await Request.send(`${tempData.mainEndPoint}/${data.regNumber}/courses/${data.courseId}/attendances`, "GET");

    if (!response.status) {
        $("#attendanceDetails").hide();
        return;
    }

    // show percentage
    $("#lblAttendancePercentage").text(`${response.data.percentage}%`);

    // load history table
    const tableData = getTableData(response.data.attendances);

    if (window.historyTable != undefined) {
        historyTable.reload(tableData);
    } else {
        loadHistoryTable(tableData);
    }

    $("#attendanceDetails").fadeIn();
}

// reset form
const resetForm = () => {
    $("#mainForm").trigger("reset");
    $("*").removeClass("is-valid");
    $("*").removeClass("is-invalid");
}