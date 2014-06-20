mainTemplate = require "./main"

data =
  title: "Hello World"

document.body.appendChild mainTemplate(data)
