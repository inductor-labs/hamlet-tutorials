var Observable = require("o_0");
var mainTemplate = require("./templates/main");

model = {
  min: 1,
  max: 10,
  value: Observable(5)
};

document.body.appendChild(mainTemplate(model));