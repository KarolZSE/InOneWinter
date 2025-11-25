const canvas = document.getElementById("Board");
const context = canvas.getContext('2d');

context.fillStyle = 'white';
context.fillRect(0, 0, 600, 600);
context.beginPath();
context.arc(300, 300, 50, 0, 2 * Math.PI);
context.stroke();

let strokes = [];
let Draw = false;
let MaxX = MaxY = 0;
let MinX = MinY = 1000;

function CheckForColor(e) {
    const rect = canvas.getBoundingClientRect();

    const width = Math.min(5, canvas.width - Math.max(0, (e.clientX - rect.left) - 2));
    const height = Math.min(5, canvas.height - Math.max(0, (e.clientY - rect.top) - 2));

    const pixel = context.getImageData(Math.max(0, (e.clientX - rect.left) - 2), Math.max(0, (e.clientY - rect.top) - 2), width, height).data;

    for (let i = 0; i < pixel.length; i += 4) {
        const r = pixel[i];
        const g = pixel[i + 1];
        const b = pixel[i + 2];

        if (r < 200) return true;
    };
    return false;
}

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (!CheckForColor(e)) return;
    Draw = true;
    const { x, y } = getCanvasPos(e);
    MinX = MaxX = x;
    MinY = MaxY = y

    strokes.push([x, y]);
});

canvas.addEventListener('mousemove', (e) => {
    if (!Draw) return;
    const { x, y } = getCanvasPos(e);
    strokes.push([x, y]);

    if (x < MinX) MinX = x;
    if (y < MinY) MinY = y;

    if (x > MaxX) MaxX = x;
    if (y > MaxY) MaxY = y;
    
});

function floodFill(imgData, x, y, fillColor) {
    const { width, height, data } = imgData;
    const stack = [[x, y]];
    const startPos = (y * width + x) * 4;
    const startColor = data.slice(startPos, startPos + 4);

    function matchColor(pos) {
        for (let i = 0; i < 4; i++) {
            if (data[pos + i] !== startColor[i]) return false;
        }
        return true;
    }

    function setColor(pos) {
        for (let i = 0; i < 4; i++) data[pos + i] = fillColor[i];
    }

    while (stack.length) {
        const [cx, cy] = stack.pop();
        const pos = (cy * width + cx) * 4;
        if (!matchColor(pos)) continue;
        setColor(pos);

        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < width - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < height - 1) stack.push([cx, cy + 1]);
    }

    context.putImageData(imgData, MinX, MinY);
}

canvas.addEventListener('mouseup', (e) => {
    Draw = false;
    if (!CheckForColor(e)) {
        strokes = [];
        return;
    }

    context.beginPath();
    context.moveTo(...strokes[0]);
    for (let i = 0; i < strokes.length; i++) {
        context.lineTo(...strokes[i]);
    }
    context.closePath();
    context.fillStyle = 'black';
    context.fill();

    const { x, y } = getCanvasPos(e);

    const imgData = context.getImageData(MinX, MinY, MaxX - MinX, MaxY - MinY);

    floodFill(imgData, x - MinX, y - MinY, [0, 0, 0, 255]);

    // context.fillStyle = 'black';
    // context.fillRect(MinX, MinY, MaxX - MinX, MaxY - MinY);
    strokes = [];
    console.log(strokes);
});
