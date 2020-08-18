local colorMod = {}

colorMod.MAX_COUNT_DOWN = 0.25
colorMod.countDown = colorMod.MAX_COUNT_DOWN
colorMod.color = {0,0.5,0.8}

function colorMod:getColor()
    return colorMod.color
end

function colorMod:update(dt)
    colorMod.countDown = colorMod.countDown - dt
    if colorMod.countDown < 0 then
        colorMod.countDown = colorMod.MAX_COUNT_DOWN
        colorMod.color = {math.random(), math.random(), math.random()}
    end
end

return colorMod