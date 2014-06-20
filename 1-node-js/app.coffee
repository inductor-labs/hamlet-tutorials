mainTemplate = require "./templates/main"

data =
  title: "Hello World"

document.body.appendChild mainTemplate(data)
