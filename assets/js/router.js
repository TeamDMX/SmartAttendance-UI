// load routes
const loadRoute = (route) => {

    let routes = getRoutes();

    // if route doesn't exist
    if (!routes[route]) {
        window.alert("This route doesnt exist (404)");
        return;
    }

    $("#iframeMain").attr("src", routes[route].path);

    // hide open modals
    $(".modal").modal("hide");

    // scroll to top
    $("html, body").animate({ scrollTop: 0 }, "slow");

    // change url
    history.pushState({}, null, `?page=${route}`);
}

// handle iframe src changing
const updateRouteInfo = () => {
    let path = document.getElementById("iframeMain").contentWindow.location.href;

    path = `.${path.substring(path.indexOf("/pages"), path.length)}`;

    // handle non authenticated cases
    if (path.indexOf("noauth.html") > -1) {
        window.location = "../login.html";
        return;
    }

    // proceed with title update
    let routes = getRoutes();
    routes = Object.values(routes).filter(route => route.path == path);
    $("#txtNavbarTitle").text(routes[0].title);

    // // public data for iframe access
    // const mainWindowData = {
    //     showOutputModal,
    //     showConfirmModal,
    //     showOutputToast,
    //     tempData,
    //     loadRoute
    // }

    // // make modal functions available inside the iframeMain
    // const iframeWindow = document.getElementById("iframeMain").contentWindow;
    // iframeWindow.mainWindow = mainWindowData;

    // // if location is dashboard, update tile visibility
    // if (path.indexOf("dashboard.html") > -1) {
    //     iframeWindow.updateTiles();
    // }

    // // set permissions for forms and other components inside iframe
    // if (iframeWindow.loadModule) {
    //     path = path.replace(".html", "");
    //     const pathParts = path.split("/");
    //     const moduleName = pathParts[pathParts.length - 1].toUpperCase().trim();
    //     const permission = tempData.privileges[moduleName];
    //     iframeWindow.loadModule(permission);
    // }
}

const getRoutes = () => {
    return {
        "dashboard": {
            title: "Dashboard",
            path: "./pages/dashboard/dashboard.html"
        },
        "course": {
            title: "Course View",
            path: "./pages/course/course.html"
        },
        "lecture": {
            title: "Lecture View",
            path: "./pages/lecture/lecture.html"
        },
        "student": {
            title: "Student View",
            path: "./pages/student/student.html"
        },
        "user": {
            title: "User View",
            path: "./pages/user/user.html"
        },
        "noauth": {
            title: "Auth Failure",
            path: "./pages/noauth.html"
        }
    }
}