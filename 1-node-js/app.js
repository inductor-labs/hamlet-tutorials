var mainTemplate = require("./templates/main");

var data = {
  title: "Hello World"
};

document.body.appendChild(mainTemplate(data));
