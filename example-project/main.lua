local colorMod = require 'src.colorMod'

local bigFont = love.graphics.newFont(36)

function love.draw()
    love.graphics.setColor(colorMod:getColor())
    love.graphics.setFont(bigFont)
    love.graphics.print("Hello World!", 100, 100)
end

function love.update(dt)
    colorMod:update(dt)
end