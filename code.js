const canvas = document.getElementById("Board");
const context = canvas.getContext('2d', { willReadFrequently: true});
const BoardContainer = document.getElementById('BoardContainer');
const Events = document.getElementById('Events');

let RegionsCount = 0;
let strokes = [];
let regions = [];
let placedBuildings = [];
let buildingImages = new Map();

let Paused = false;
let StartTime = Date.now();

let GlobalSizeEstimate = 0;
let Draw = false;
let MaxX = MaxY = 0;
let MinX = MinY = 1000;

const FuelMinedHTML = document.getElementById('FuelMined');
const FoodEarnedHTML = document.getElementById('FoodEarned');
const FuelExSideInfo = document.getElementById('FuelExSideInfo');
const FoodEarnedSideInfo = document.getElementById('FoodEarnedSideInfo');
const WaterMinedHTML = document.getElementById('WaterMined');
const WaterSideInfo = document.getElementById('WaterSideInfo');
let FuelMined = 0;
let FoodEarned = 100;
let WaterMined = 100;

function CheckForColor(e) {
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let mouseX = (e.clientX - rect.left) * scaleX;
    let mouseY = (e.clientY - rect.top) * scaleY;

    const width = Math.min(5, canvas.width - Math.max(0, mouseX - 2));
    const height = Math.min(5, canvas.height - Math.max(0, mouseY - 2));

    const pixel = context.getImageData(Math.max(0, mouseX - 2), Math.max(0, mouseY - 2), width, height).data;

    for (let i = 0; i < pixel.length; i += 4) {
        const r = pixel[i];
        const g = pixel[i + 1];
        const b = pixel[i + 2];

        console.log(r, g, b);
        if (r < 200) return true;
    };
    return false;
}

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (Paused) return;
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
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 68, 255, 0.5)';
    context.beginPath();
    context.arc(BoardContainer.offsetWidth / 2, BoardContainer.offsetHeight / 2, 50, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(0, 0, 0, 1)';
    context.font = '16px sans-serif';
    context.textBaseline = "bottom";
    context.fillText("Region 0", BoardContainer.offsetWidth / 2 - 30, BoardContainer.offsetHeight / 2);
    context.textBaseline = 'top';
    context.fillText("(build around it)", BoardContainer.offsetWidth / 2 - 55, BoardContainer.offsetHeight / 2);
    context.fillStyle = 'rgba(0, 68, 255, 0.5)';

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
            context.fillStyle = "rgba(180, 230, 0, 1)";
            context.fill();
        } else {
            context.fillStyle = 'rgba(0, 68, 255, 0.5)';
            context.fill();
        }

        if (region.text) {
            const [cx, cy] = polygonCentroid(region.polygon);
            context.fillStyle = 'rgba(0, 0, 0, 1)';
            context.font = '16px sans-serif';
            context.fillText(region.text, cx, cy);
        }
    }

    for (let building of placedBuildings) {
        context.drawImage(building.img, building.x, building.y, building.width, building.height);
    }
}

canvas.style.position = 'absolute';
canvas.style.left = '0px';
canvas.style.top = '0px';


let hoveredRegion = null;
drawAll();

const rect = BoardContainer.getBoundingClientRect();
mousePos = { x: BoardContainer.width / 2, y: BoardContainer.height / 2 };

BoardContainer.addEventListener('mousemove', (e) => {
    if (Paused) return;
    const rect = BoardContainer.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    const { x, y } = getCanvasPos(e);
    hoveredRegion = null;

    for (let region of regions) {
        if (PointInMultiPolygon([x, y], region.polygon)) {
            hoveredRegion = region;
            document.getElementById('text').textContent = region.text;

            let fuel = document.getElementById('fuel');
            if (region.fuel > 50) {
                fuel.style.color = 'green';
            } else if (region.fuel >= 1) {
                fuel.style.color = '#ff9900';
            } else {
                fuel.style.color = 'red';
            }
            fuel.textContent = region.fuel;

            let food = document.getElementById('food');
            if (region.food > 50) {
                food.style.color = 'green';
            } else if (region.food >= 1) {
                food.style.color = '#ff9900';
            } else {
                food.style.color = 'red';
            }
            food.textContent = region.food;

            water = document.getElementById('water');
            if (region.water > 50) {
                water.style.color = 'green';
            } else if (region.water >= 1) {
                water.style.color = '#ff9900';
            } else {
                water.style.color = 'red';
            }
            water.textContent = region.water;

            if (region.fuel - 1 >= 0) {
                FuelExSideInfo.textContent = `This region produces ${region.FuelExtractors} liter of fuel per second`;
            } else FuelExSideInfo.textContent = 'The region has run out off fuel';

            if (region.food - 1 >= 0) {
                FoodEarnedSideInfo.textContent = `This region produces ${region.Farms} kilograms of food per second`;
            } else FoodEarnedSideInfo.textContent = 'The region has run out off animals';
            
            if (region.water - 1 >= 0) {
                WaterSideInfo.textContent = `This region produces ${region.Wells} liter of water per second`;
            } else WaterSideInfo.textContent = 'The region has run out off water';

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

BoardContainer.addEventListener('contextmenu', (e) => {
    if (Paused) return;
    const { x, y } = getCanvasPos(e);

    for (let region of regions) {
        if (PointInMultiPolygon([x, y], region.polygon)) {
            e.preventDefault();

            const [cx, cy] = polygonCentroid(region.polygon);

            const input = document.createElement('input');
            input.type = 'text';
            input.value = region.text;
            input.classList.add('NameChange');
            input.style.left = `${cx * zoom + canvas.offsetLeft}px`;
            input.style.top = `${cy * zoom + canvas.offsetTop}px`;

            document.body.appendChild(input);

            input.focus();
            input.select();

            const finalize = () => {
                region.text = input.value;
                drawAll();
                document.body.removeChild(input);
            }

            input.addEventListener('blur', finalize);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    finalize();
                }
            });

            break;
        }
    }
})

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

function polygonArea(points) {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % n];

        area += (x0 * y1 - x1 * y0);
    }

    return Math.abs(area / 2);
}

canvas.addEventListener('mouseup', (e) => {
    Draw = false;

    if (strokes.length === 0) {
        return;
    }

    if (!CheckForColor(e)) {
        strokes = [];
        return;
    }
    
    let newPoly = [[...strokes]];

    for (let region of regions) {
        newPoly = martinez.diff(newPoly, [region.polygon]);
        if (!newPoly || newPoly.length === 0) break;
    }

    if (!newPoly || newPoly.length === 0) {
        console.log('Region overlaps');
        strokes = [];
        return;
    }

    function flatten(polys) {
        let result = [];
        for (let p of polys) {
            if (typeof p[0][0] === 'number') {
                result.push(p);
            } else {
                result.push(...flatten(p));
            }
        }

        return result;
    }
    
    const flattened = flatten(newPoly);

    for (let poly of flattened) {
        let SizeEstimate = polygonArea(poly);
        if (SizeEstimate < 100) return;
        GlobalSizeEstimate += SizeEstimate;
        RegionsCount++;

        regions.push({
            polygon: poly,
            text: `Region ${RegionsCount}`,
            fillColor: 'green',
            fuel: (SizeEstimate * Math.random() * 0.03).toFixed(2),
            food: (SizeEstimate * Math.random() * 0.05).toFixed(2),
            water: (SizeEstimate * Math.random() * 0.05).toFixed(2),
            FuelExtractors: 0,
            Farms: 0,
            Wells: 0
        });
    }

    strokes = [];
    console.log((MaxX - MinX) * (MaxY - MinY));

    drawAll();
});

function PointInMultiPolygon(point, polygonOrMulitipolygon) {
    if (!Array.isArray(polygonOrMulitipolygon[0][0])) {
        return PointInPolygon(point, polygonOrMulitipolygon);
    }

    for (let poly of polygonOrMulitipolygon) {
        if (PointInPolygon(point, poly)) return true;
    }

    return false;
}

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
        img.src = urlMatch[1];
        buildingImages.set(e, img);
    }

    let isDragging = false;
    let ghost = null;

    e.addEventListener('mousedown', (ev) => {
        if (Paused) return;
        isDragging = true;
        
        ghost = document.createElement('div');
        ghost.classList.add('Ghost');
        ghost.style.backgroundImage = bgImage;
        document.body.appendChild(ghost);

        ghost.style.left = ev.clientX - 20 + 'px';
        ghost.style.top = ev.clientY - 20 + 'px';

        ev.preventDefault();
    });

    canvas.addEventListener('mousemove', (ev) => {
        if (!isDragging) return;

        ghost.style.left = ev.clientX - 20 + 'px';
        ghost.style.top = ev.clientY - 20 + 'px';
    });

    canvas.addEventListener('mouseup', (ev) => {
        if (!isDragging) return;
        isDragging = false;

        const { x: cx, y: cy } = getCanvasPos(ev);

        for (let region of regions) {
            if (PointInMultiPolygon([cx, cy], region.polygon)) {

                if (e.id == 'FuelEx') {
                    region.FuelExtractors++;
                    const FuelMining = setInterval(() => {
                        if (region.fuel - 1 >= 0) {
                            region.fuel--;
                            FuelMinedHTML.textContent = ++FuelMined;
                        } else {
                            region.fuel = 0;
                            if (region.FuelExtractors > 0) {
                                region.FuelExtractors = 0;
                                const info = document.createElement('li');
                                info.textContent = `${region.text} has run out off fuel!`;
                                Events.appendChild(info);
                                setTimeout(() => {
                                    Events.removeChild(info);
                                }, 3000);
                            }
                            clearInterval(FuelMining);
                        }
                    }, 1000);
                } else if (e.id == 'Farm') {
                    region.Farms++;
                    const Farming = setInterval(() => {
                        if (region.food - 1 >= 0) {
                            region.food--;
                            FoodEarnedHTML.textContent = ++FoodEarned;
                        } else {
                            region.food = 0;
                            if (region.Farms > 0) {
                                region.Farms = 0;
                                const info = document.createElement('li');
                                info.textContent = `${region.text} has run out off food!`;
                                Events.appendChild(info);
                                setTimeout(() => {
                                    Events.removeChild(info);
                                }, 3000);
                            }                          
                            clearInterval(Farming);
                        }
                    }, 1000);
                } else if (e.id == 'Well') {
                    region.Wells++;
                    const WaterMining = setInterval(() => {
                        if (region.water - 1 >= 0) {
                            region.water--;
                            WaterMinedHTML.textContent = ++WaterMined;
                        } else {
                            region.water = 0;
                            if (region.Wells > 0) {
                                region.Wells = 0;
                                const info = document.createElement('li');
                                info.textContent = `${region.text} has run out off water!`;
                                Events.appendChild(info);
                                setTimeout(() => {
                                    Events.removeChild(info);
                                }, 3000);
                            }                          
                            clearInterval(WaterMining);
                        }
                    }, 1000);
                }

                const img = buildingImages.get(e);

                if (img) {
                    placedBuildings.push({
                        img: img,
                        x: cx - 20,
                        y: cy - 20,
                        width: 40,
                        height: 40,
                    });
                }
            
                drawAll();
                break;
            } 
        }

        if (ghost) {
            document.body.removeChild(ghost);
            ghost = null;
        }
    });
});

const PeopleHTML = document.getElementById('People');
const TemperatureHTML = document.getElementById('Temperature');
const MoraleHTML = document.getElementById('Morale');
const TimeHTML = document.getElementById('Time');
const CauseOfDeath = document.getElementById('CauseOfDeath');
const EndWindow = document.getElementById('EndWindow');

let People = 2;
let Temperature = 15;
let Morale = 100;
setInterval(() => {
    if (Paused) return;
    People++;
    PeopleHTML.textContent = People;
}, 5000);

setInterval(() => {
    if (Paused) return;
    FuelMined -= (0.1 * (GlobalSizeEstimate / 1000)).toFixed(2);
    if (FuelMined > 0) {
        Temperature = Math.min(Temperature + 1, 30);
    } else {
        Temperature--;
    }

    if (Temperature <= 0) {
        Morale--;
        People--;
        CauseOfDeath.textContent = 'Hypothermia';
    }
    
    FoodEarned -= People;
    if (FoodEarned <= 0) {
        Morale--;
        People--;
        CauseOfDeath.textContent = 'Lack of food';
    }

    WaterMined -= People;
    if (WaterMined <= 0) {
        Morale--
        People--;
        CauseOfDeath.textContent = 'Lack of water';
    }

    if (People <= 0) {
        TimeHTML.textContent = (Date.now() - StartTime) / 1000;
        Paused = true;
        console.log('Games Over!');
        EndWindow.style.display = 'flex';
    }

    if (Morale <= 0) {
        CauseOfDeath.textContent = 'Morale was so low people overthrowned you!';
        TimeHTML.textContent = (Date.now() - StartTime) / 1000;
        Paused = true;
        console.log('Games Over!');
        EndWindow.style.display = 'flex';
    }
    FuelMined = Math.max(0, FuelMined);
    FoodEarned = Math.max(0, FoodEarned);
    WaterMined = Math.max(0, WaterMined);
    MoraleHTML.textContent = Morale;
    WaterMinedHTML.textContent = WaterMined;
    FoodEarnedHTML.textContent = FoodEarned;
    FuelMinedHTML.textContent = Math.floor(FuelMined);
    TemperatureHTML.textContent = Temperature;
    PeopleHTML.textContent = People;
}, 1000);

let zoom = 1;
document.getElementById('Plus').addEventListener('click', () => {
    zoom += 0.1;
    canvas.style.zoom = zoom; 
});

document.getElementById('Minus').addEventListener('click', () => {
    zoom -= 0.1;
    canvas.style.zoom = zoom; 
});

document.getElementById('OneLastTime').addEventListener('click', () => {
    EndWindow.style.display = 'none';
});