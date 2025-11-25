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

canvas.addEventListener('mousedown', (e) => {
    if (!CheckForColor(e)) return;
    Draw = true;
    strokes.push([e.clientX, e.clientY]);
});

canvas.addEventListener('mousemove', (e) => {
    if (!Draw) return;
    strokes.push([e.clientX, e.clientY]);
    if (MinX > e.clientX) MinX = e.clientX;
    if (MinY > e.clientY) MinY = e.clientY;

    if (MaxX < e.clientX) MaxX = e.clientX;
    if (MaxY < e.clientY) MaxY = e.clientY;
    
});

canvas.addEventListener('mouseup', (e) => {
    Draw = false;
    if (!CheckForColor(e)) return;
    for (let i = 0; i < strokes.length - 1; i++) {
        context.moveTo(...strokes[i]);
        context.lineTo(...strokes[i + 1]);
        context.stroke();
    }
    context.fillStyle = 'black';
    // context.fillRect(MinX, MinY, MaxX - MinX, MaxY - MinY);
    strokes = [];
    console.log(strokes);
});
