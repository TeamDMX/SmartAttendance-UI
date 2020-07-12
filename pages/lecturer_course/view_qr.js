$(document).ready(() => {
    init();
});

const init = () => {
    const lectureId = getParameterByName("lectureId");

    const socket = io(`/api/mark_attendance?lecture_id=${lectureId}`);

    socket.on('connect', () => {
        console.log("connected");
    });

    let qr = null;
    socket.on('code', function (data) {
        if (qr == null) {
            qr = new QRCode(document.getElementById("qrCode"), {
                text:  data.toString(),
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
        console.log(data);
    });

    socket.on('error', function (data) {
        console.log(data);
    });

}


const getParameterByName = (name, url = window.location.href) => {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}