window.tempData = { lecturerId: null, lectureId: null };

$(document).ready(() => {
    init();
});

const init = async () => {
    const lectureId = getParameterByName("lectureId");
    const lecturerId = getParameterByName("lecturerId");

    // get lecture info
    const response = await Request.send(`/api/lecturers/${lecturerId}/lectures/${lectureId}`);

    if (!response.status) {
        window.location = "./lecturer_course.html";
        return;
    }

    tempData.lecturerId = lecturerId;
    tempData.lectureId = lectureId;

    // lecture details
    const entry = response.data;

    $("#lblCourseName").text(entry.course.name);
    $("#lblLecCode").text(entry.code);
    $("#lblLecDatetime").text(moment(entry.startDatetime).format("YYYY/MM/DD"));

    // clear ui
    $("#liveMarkingList").empty();

    const socket = io(`/api/mark_attendance?lecture_id=${lectureId}`);

    socket.on('connect', () => {
        console.log("connected");
    });

    let qr = null;
    socket.on('code', function (data) {
        if (qr == null) {
            qr = new QRCode(document.getElementById("qrCode"), {
                text: data.toString(),
                width: 600,
                height: 600,
            });
        } else {
            qr.clear();
            qr.makeCode(data.toString());
        }
        console.log(data);
    });

    socket.on('newMarking', function (data) {
        const jdata = JSON.parse(data);
        const student = jdata.student;
        $("#liveMarkingList").prepend(`<span class="badge badge-success">${student.indexNumber} marked as present</span>
        <p class=" marktext">${moment(new Date()).format("HH:mm")}</p>`);
    });

    socket.on('error', function (data) {
        alert(data);
        console.log(data);
    });

    $("#btnFinishMarking").on("click", finishMarking);
    $("#btnCancelMarking").on("click", cancelMarking);
}

const cancelMarking = async () => {
    const con = window.confirm("Do you really want to cancel this session?");
    if (con) {
        const response = await Request.send(`/api/lecturers/${tempData.lecturerId}/lectures/${tempData.lectureId}/attendances/cancel`);
        if (response.status) {
            window.location = "./lecturer_course.html";
        }
    }
}

const finishMarking = async () => {
    const con = window.confirm("Do you really want to finish this session?");
    if (con) {
        const response = await Request.send(`/api/lecturers/${tempData.lecturerId}/lectures/${tempData.lectureId}/attendances/finish`);
        if (response.status) {
            window.location = "./lecturer_course.html";
        }
    }
}

const getParameterByName = (name, url = window.location.href) => {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}