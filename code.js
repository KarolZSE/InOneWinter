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

const BoardContainer = document.getElementById('BoardContainer');
canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasPos(e);
    /*
    console.log(canvas.offsetLeft, x);
    if (x < 10) {
        console.log('1');
        canvas.style.left = canvas.offsetLeft - 10 - x + 'px';
    } else if (x > canvas.offsetWidth - 10)  {
        console.log('2');
        canvas.style.left = canvas.offsetLeft + 10 - 600 + x + 'px';
    }
        */

    const rect = BoardContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let newLeft = parseInt(canvas.style.left || "0");
    let newTop = parseInt(canvas.style.top || "0");

    if (mouseX < 10) {
        newLeft += 5;
    }

    if (mouseX > rect.width - 10) {
        newLeft -= 5;
    }

    if (mouseY < 10) {
        newTop += 5;
    }

    if (mouseY > rect.height - 10) {
        newTop -= 5;
    }

    canvas.style.left = newLeft + 'px';
    canvas.style.top = newTop + 'px';



    if (!Draw) return;
    strokes.push([x, y]);

    if (x < MinX) MinX = x;
    if (y < MinY) MinY = y;

    if (x > MaxX) MaxX = x;
    if (y > MaxY) MaxY = y;
    
});

function floodFill(imgData, x, y, fillColor) {
    const { width, height, data } = imgData;

    const startPos = (y * width + x) * 4;
    const startColor = data.slice(startPos, startPos + 4);

    if (startColor.every((v, i) => v === fillColor[i])) return;

    const equalsStart = (pos) => {
        return (
            data[pos] === startColor[0] &&
            data[pos + 1] === startColor[1] &&
            data[pos + 2] === startColor[2] &&
            data[pos + 3] === startColor[3]
        );
    }

    const stack = [[x, y]];

    while (stack.length > 0) {
        const [cx, cy] = stack.pop();

        let left = nx;
        let pos = (cy * width + cx) * 4;

        while (left >= 0 && equalsStart(pos)) {
            left--;
            pos -= 4;
        }

        left++;

        let right = nx;
        pos = (cy * width + right) * 4;
        while(right < width && equalsStart(pos)) {
            right++;
            pos += 4;
        }

        for (let i = left; i < right; i++) {
            let p = (cy * width + i) * 4;
            data[p] === fillColor[0];
            data[p + 1] === fillColor[1];
            data[p + 2] === fillColor[2];
            data[p + 3] === fillColor[3];

            if (cy > 0) {
                let up = p - width * 4;
                if (equalsStart(up)) stack.push([i, cy - 1]);
            }

            if (cy < height - 1) {
                let down = p + width * 4;
                if (equalsStart(down)) stack.push([i, cy + 1]);
            }
        }
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

    strokes = [];
    console.log(strokes);
});
