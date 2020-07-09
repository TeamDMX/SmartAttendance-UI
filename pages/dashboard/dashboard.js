function updateTiles() {
    // make router available inside iframe
    window.loadRoute = mainWindow.loadRoute;
    
    // show hide tiles based on privileges
    const privileges = mainWindow.tempData.privileges;
    
    // hide all tiles
    $(".MODULE").hide();

    // show tiles based on privileges
    Object.keys(privileges).forEach(p => {        
        if (privileges[p].split("")[1] == "0") return;
        $(`.MODULE-${p}`).show();
    });
}