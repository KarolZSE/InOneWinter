const canvas = document.getElementById("Board");
const context = canvas.getContext('2d');

context.beginPath();
context.arc(300, 300, 50, 0, 2 * Math.PI);
context.stroke();

let strokes = [];
let Draw = false;
canvas.addEventListener('mousedown', (e) => {
    Draw = true;
    strokes.push([e.clientX, e.clientY]);
});

canvas.addEventListener('mousemove', (e) => {
    if (!Draw) return;
    strokes.push([e.clientX, e.clientY]);
});

canvas.addEventListener('mouseup', () => {
    Draw = false;
    for (let i = 0; i < strokes.length - 1; i++) {
        context.moveTo(...strokes[i]);
        context.lineTo(...strokes[i + 1]);
        context.stroke();
    }
    strokes = [];
    console.log(strokes);
});