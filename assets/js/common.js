class FormUtil {
    static validateElementValue(elementValidationInfo) {
        // create selector name for ui element id
        const selector = `#${elementValidationInfo.attribute}`;

        // get value of element id
        const value = $(selector).val();

        // create RegExp object from regex string
        const regex = new RegExp(elementValidationInfo.regex);

        // if value is optional and not set, ignore
        if (elementValidationInfo.optional && value.trim() == "") {
            $(selector).removeClass(".is-valid");
            $(selector).removeClass(".is-invalid");
            return true;
        }

        // check form values with each regex
        if (!regex.test(value)) {
            $(selector).removeClass("is-valid");
            $(selector).addClass("is-invalid");
            return false;
        } else {
            $(selector).removeClass("is-invalid");
            $(selector).addClass("is-valid");
            return true;
        }
    }

    static enableRealtimeValidation(validationInfo) {
        
        // provide freedback when user interact with form elements
        validationInfo.forEach(vi => {
            $(`#${vi.attribute}`).on("keyup change", () => {
                this.validateElementValue(vi);
            });
        });
    }

    // make an form read only
    static setReadOnly(selector, readOnly) {
        if (readOnly) {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", true);
                    $(el).attr("disabled", true);
                    $(el).addClass("no-outline");
                    $(".form-group").removeClass("has-error has-success");
                    $(".form-group").children(".form-control-feedback").remove();
                }

                // fix for empty inputs
                if (($(el).is("input") || $(el).is("textarea")) && $(el).val().trim() == "") {
                    try {
                        $(el).val("Not Provided.");
                    } catch {}
                }
            });

            // hide required labels
            $("label span.required").addClass("required-hidden");

            // hide top action buttons
            $("#actionButtonHolder").hide();

        } else {
            $(`${selector} .form-group`).children().each((i, el) => {
                if ($(el).data("editable") == true) {
                    $(el).attr("readonly", false);
                    $(el).attr("disabled", false);
                    $(el).removeClass("no-outline");
                }

                if (($(el).is("input") || $(el).is("textarea")) && $(el).val().trim() == "Not Provided.") {
                    try {
                        $(el).val("");
                    } catch {}
                }
            });

            // show required labels
            $("label span.required").removeClass("required-hidden");

            // show top action buttons
            $("#actionButtonHolder").show();
        }
    }

    // print a form
    static print() {
        $("input[type=file]").hide();
        $("#fmButtons").hide();
        $("#tabHolder").hide();
        $(".form-control").addClass("form-control-no-border");
        $("select,.from-control").addClass("select-no-arrow");
        window.print();
        $("#fmButtons").show();
        $("#tabHolder").show();
        $("input[type=file]").show();
        $(".form-control").removeClass("form-control-no-border");
        $("select,.from-control").removeClass("select-no-arrow");
        return true;
    }

    // select an option in a dropdown using value
    static selectDropdownOptionByValue(dropdownId, optionValue) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the value of current option element
            const currentValue = $(this).attr("value");

            // check if current value is equal to given value
            if (currentValue == optionValue) {
                $(this).attr("selected", "selected");
            }
        });
    }

    // select an option in a dropdown using text
    static selectDropdownOptionByText(dropdownId, optionText) {
        $(`#${dropdownId}`).children("option").each(function () {
            $(this).removeAttr("selected");

            // get the text of current option element
            const currentText = $(this).text();

            // check if current text is equal to given text
            if (currentText == optionText) {
                $(this).attr("selected", "selected");
            }
        });
    }
}

class ImageUtil {
    static getURLfromBuffer(buffer) {
        // create image url from buffer data recived from server
        const arrayBufferView = new Uint8Array(buffer.data);
        const blob = new Blob([arrayBufferView], { type: "image/png" });
        const urlCreator = window.URL || window.webkitURL;
        const imageUrl = urlCreator.createObjectURL(blob);
        return imageUrl;
    }

    static getBase64FromFile(file) {
        // create a base64 string from a file object
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

class Request {
    static send(path, method, data = {}) {
        // this promise will never reject to prevent unhandled promise rejections
        return new Promise((resolve, reject) => {

            // options for sending http requests
            const options = {
                type: method,
                contentType: "application/json; charset=utf-8",
                url: `http://localhost:3000${path}`,
                data: data,
                dataType: "json"
            }

            // send json strings on POST, PUT & DELETE requests
            if (method == "POST" || method == "PUT" || method == "DELETE") {
                options.data = JSON.stringify(data);
            }

            // create a new request with options
            const req = $.ajax(options);

            // when request is complete
            req.done((res) => {

                // if response doesn't have a status propery, ignore it
                if (res.status == undefined) return;

                // if response status is true, resovle the promoise
                if (res.status) {
                    resolve(res);

                } else {
                    // log the response
                    console.log(res);

                    // show error modal when status of the response is false
                    try {
                        mainWindow.showOutputModal("Error", `${res.msg}`);

                        // check if this is an authentication error (when logged out)
                        if (res.type == "auth") {
                            window.location = "noauth.html"
                        }
                    } catch (e) { }

                    // resolve the promise with false status
                    resolve({ status: false });
                }
            });

            // if request failed to complete
            req.fail((jqXHR, textStatus) => {
                // if no json response is recived, ignore it
                if (jqXHR.responseJSON == undefined) return;

                // show error modal 
                try {
                    mainWindow.showOutputModal("Error", jqXHR.responseJSON.msg);

                    // check if this is an authentication error (when logged out or session empty)
                    if (jqXHR.responseJSON.type == "auth") {
                        window.location = "noauth.html"
                    }
                } catch (e) {

                    // if no error msg is present to show, just show a generic error modal
                    console.log(e);
                    mainWindow.showOutputModal("Error", `Unable to retrive data from the server: ${textStatus}`);
                }

                // resolve the promise with false status
                resolve({ status: false });
            });
        });
    }
}

// Misc functions for useful tasks

// capitalazie first letters of words in a given string
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// get today in inputtype=date compatible format
Date.prototype.today = function () {
    const now = new Date();
    const day = ("0" + now.getDate()).slice(-2);
    const month = ("0" + (now.getMonth() + 1)).slice(-2);
    return (now.getFullYear() + "-" + (month) + "-" + (day));
}