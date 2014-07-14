Observable = require "o_0"
mainTemplate = require "./templates/main"

Tab = (name, content) ->
  name: name
  content: content
  click: ->
    activeTab(this)
  class: ->
    "active" if this is activeTab()

tabs = [1..3].map (i) ->
  Tab "Tab ##{i}", "Hello from tab #{i}"

activeTab = Observable tabs[0]

model =
  tabs: tabs
  activeTab: activeTab
  content: ->
    @activeTab().content

document.body.appendChild mainTemplate(model)
