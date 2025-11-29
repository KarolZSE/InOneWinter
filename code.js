const canvas = document.getElementById("Board");
const context = canvas.getContext('2d', { willReadFrequently: true});

context.fillStyle = 'white';
context.fillRect(0, 0, 600, 600);
context.beginPath();
context.arc(300, 300, 50, 0, 2 * Math.PI);
context.stroke();

let strokes = [];
let regions = [];
let placedBuildings = [];
let buildingImages = new Map();

let GlobalSizeEstimate = 0;
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

function polygonCentroid(points) {
    let x = y = 0;
    for (let p of points) {
        x += p[0];
        y += p[1];
    }

    return [x / points.length, y / points.length];
}

function drawAll() {
    // context.clearRect(0, 0, canvas.width, canvas.height);
    if (hoveredRegion) {
        document.getElementById('RegionResources').style.display = 'inline';
    } else {
        document.getElementById('RegionResources').style.display = 'none';
    }

    for (let region of regions) {
        context.beginPath();
        context.moveTo(...region.polygon[0]);
        for (let p of region.polygon) context.lineTo(...p);
        context.closePath();

        if (region === hoveredRegion) {
            context.fillStyle = "rgba(255, 230, 0, 1)";
            context.fill();
        } else {
            context.fillStyle = region.fillColor;
            context.fill();
        }

        if (region.text) {
            const [cx, cy] = polygonCentroid(region.polygon);
            context.fillStyle = 'green';
            context.font = '16px sans-serif';
            context.fillText(region.text, cx, cy);
        }
    }

    for (let building of placedBuildings) {
        context.drawImage(building.img, building.x, building.y, building.width, building.height);
    }
}

const BoardContainer = document.getElementById('BoardContainer');

canvas.style.position = 'absolute';
canvas.style.left = '0px';
canvas.style.top = '0px';


let hoveredRegion = null;

const rect = BoardContainer.getBoundingClientRect();
mousePos = { x: BoardContainer.width / 2, y: BoardContainer.height / 2 };

BoardContainer.addEventListener('mousemove', (e) => {
    const rect = BoardContainer.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    const { x, y } = getCanvasPos(e);
    hoveredRegion = null;

    for (let region of regions) {
        if (PointInPolygon([x, y], region.polygon)) {
            hoveredRegion = region;
            document.getElementById('text').textContent = region.text;
            document.getElementById('fuel').textContent = region.fuel;
            document.getElementById('food').textContent = region.food;
            document.getElementById('water').textContent = region.water;
            break;
        }
    }

    drawAll();
    
    if (!Draw) return;
    strokes.push([x, y]);

    if (x < MinX) MinX = x;
    if (y < MinY) MinY = y;

    if (x > MaxX) MaxX = x;
    if (y > MaxY) MaxY = y;
    
});

function scrollCanvas() {
    const rect = BoardContainer.getBoundingClientRect();
    let left = parseInt(canvas.style.left);
    let top = parseInt(canvas.style.top);    

    const edge = 20;
    const speed = 10;

    if (mousePos.x < edge) left += speed;
    if (mousePos.x > rect.width - edge) left -= speed;

    if (mousePos.y < edge) top += speed;
    if (mousePos.y > rect.height - edge) top -= speed;
    
    canvas.style.left = left + 'px';
    canvas.style.top = top + 'px';

    requestAnimationFrame(scrollCanvas);
}

scrollCanvas();


BoardContainer.addEventListener('mouseleave', () => {
    const rect = BoardContainer.getBoundingClientRect();
    mousePos = { x: BoardContainer.width / 2, y: BoardContainer.height / 2 };
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

        let left = cx;
        let pos = (cy * width + cx) * 4;

        while (left >= 0 && equalsStart(pos)) {
            left--;
            pos -= 4;
        }

        left++;

        let right = cx;
        pos = (cy * width + right) * 4;
        while(right < width && equalsStart(pos)) {
            right++;
            pos += 4;
        }

        for (let i = left; i < right; i++) {
            let p = (cy * width + i) * 4;
            data[p] = fillColor[0];
            data[p + 1] = fillColor[1];
            data[p + 2] = fillColor[2];
            data[p + 3] = fillColor[3];

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
    context.fillStyle = 'green';
    context.fill();

    let SizeEstimate = (MaxX - MinX) * (MaxY - MinY);
    GlobalSizeEstimate += SizeEstimate;
    regions.push({
        polygon: [...strokes],
        text: '1234',
        fuel: (SizeEstimate * Math.random() * 0.03).toFixed(2),
        food: (SizeEstimate * Math.random() * 0.05).toFixed(2),
        water: (SizeEstimate * Math.random() * 0.05).toFixed(2)
    });

    const { x, y } = getCanvasPos(e);

    const imgData = context.getImageData(MinX, MinY, MaxX - MinX, MaxY - MinY);

    floodFill(imgData, x - MinX, y - MinY, [0, 0, 0, 255]);

    strokes = [];
    console.log((MaxX - MinX) * (MaxY - MinY));
});


function PointInPolygon(point, polygon) {
    let [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];

        let intersect = 
            yi > y != yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

const buildings = document.querySelectorAll('#BuildingsMenu div');
buildings.forEach(e => {
    const bgImage = window.getComputedStyle(e).backgroundImage;
    const urlMatch = bgImage.match(/url\(["']?([^"']*)["']?\)/);

    if (urlMatch && urlMatch[1]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        console.log(2 / 3);
        img.src = urlMatch[1];
        buildingImages.set(e, img);
    }
});

const FuelMinedHTML = document.getElementById('FuelMined');
const FuelExSideInfo = document.getElementById('FuelExSideInfo');
let FuelExtractors = 0;
let FuelMined = 0;
buildings.forEach(e => {
    let isDragging = false;
    let offsetX, offsetY;

    e.addEventListener('mousedown', (ev) => {
        isDragging = true;
        offsetX = ev.offsetX;
        offsetY = ev.offsetY;
        ev.stopPropagation();
    });

    e.addEventListener('mousemove', (ev) => {
        if (!isDragging) return;

        e.style.left = (ev.pageX - offsetX) + 'px';
        e.style.top = (ev.pageY - offsetY) + 'px';
    });

    canvas.addEventListener('mouseup', (ev) => {
        if (!isDragging) return;
        isDragging = false;

        const { x: cx, y: cy } = getCanvasPos(ev);

        e.style.left = (ev.pageX - offsetX) + 'px';
        e.style.top = (ev.pageY - offsetY) + 'px';

        for (let region of regions) {
            if (PointInPolygon([cx, cy], region.polygon)) {

                if (e.id == 'FuelEx') {
                    FuelExtractors++;
                    setInterval(() => {
                        if (region.fuel > 0) {
                            region.fuel--;
                            FuelMinedHTML.textContent = ++FuelMined;
                            FuelExSideInfo.textContent = `This region produces ${FuelExtractors} liter of fuel per second`;
                        } else {
                            FuelExSideInfo.textContent = 'The region has run out off fuel';
                        }
                    }, 1000);
                }

                const img = buildingImages.get(e);

                if (img) {
                    if (img.complete) {
                        placedBuildings.push({
                            img: img,
                            x: cx - 40,
                            y: cy - 40,
                            width: 80,
                            height: 80
                        });

                    drawAll();
                    } else {
                        img.onload = () => {
                            placedBuildings.push({
                                img: img,
                                x: cx - 40,
                                y: cy - 40,
                                width: 80,
                                height: 80
                            });

                        drawAll();
                        };
                    }   
                }

            break;
            } 
        }
    });
});

const PeopleHTML = document.getElementById('People');
const TemperatureHTML = document.getElementById('Temperature');
let People = 2;
let Temperature = 15;
setInterval(() => {
    People++;
    PeopleHTML.textContent = People;
}, 5000);

setInterval(() => {
    FuelMined -= (0.1 * (GlobalSizeEstimate / 1000)).toFixed(2);
    if (FuelMined > 0) {
        Temperature = Math.min(Temperature + 1, 30);
    } else {
        Temperature--;
    }

    if (Temperature <= 0) {
        People--;
    }
    
    if (People <= 0) {
        console.log('Games Over!');
    }

    FuelMined = Math.max(0, FuelMined);
    FuelMinedHTML.textContent = Math.floor(FuelMined);
    TemperatureHTML.textContent = Temperature;
    PeopleHTML.textContent = People;
}, 1000);