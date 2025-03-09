class PathFinding {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.cellSize = 25;
        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;
        
        this.grid = [];
        this.start = { x: 0, y: 0 };
        this.food = null;
        this.obstacles = [];
        
        // 添加动画相关属性
        this.currentAnimation = null;
        this.isAnimationStopped = false;
        
        this.initializeGrid();
        this.generateMap();
        this.addEventListeners();
    }

    initializeGrid() {
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = 0; // 0: empty, 1: obstacle, 2: food
            }
        }
    }

    generateMap() {
        // 清空网格
        this.initializeGrid();
        this.obstacles = [];

        // 生成随机障碍物
        const obstacleCount = Math.floor(this.gridSize * this.gridSize * 0.2);
        for (let i = 0; i < obstacleCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
            } while (
                this.grid[y][x] !== 0 || 
                (x === this.start.x && y === this.start.y) ||
                (x === 0 && y === 0)
            );
            
            this.grid[y][x] = 1;
            this.obstacles.push({ x, y });
        }

        // 生成食物
        do {
            this.food = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
        } while (
            this.grid[this.food.y][this.food.x] === 1 ||
            (this.food.x === this.start.x && this.food.y === this.start.y)
        );
        
        this.grid[this.food.y][this.food.x] = 2;
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.ctx.strokeStyle = '#ccc';
                this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

                if (this.grid[y][x] === 1) {
                    // 障碍物
                    this.ctx.fillStyle = '#666';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                } else if (this.grid[y][x] === 2) {
                    // 食物
                    this.ctx.fillStyle = 'red';
                    this.ctx.beginPath();
                    this.ctx.arc(
                        x * this.cellSize + this.cellSize / 2,
                        y * this.cellSize + this.cellSize / 2,
                        this.cellSize / 3,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }
            }
        }

        // 绘制起点（蛇头）
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(
            this.start.x * this.cellSize,
            this.start.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );
    }

    drawPath(path, color = 'blue') {
        if (!path) return;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(
            this.start.x * this.cellSize + this.cellSize / 2,
            this.start.y * this.cellSize + this.cellSize / 2
        );

        for (const point of path) {
            this.ctx.lineTo(
                point.x * this.cellSize + this.cellSize / 2,
                point.y * this.cellSize + this.cellSize / 2
            );
        }

        this.ctx.stroke();
    }

    manhattanDistance(p1, p2) {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    }

    getNeighbors(point) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // 上
            { x: 1, y: 0 },  // 右
            { x: 0, y: 1 },  // 下
            { x: -1, y: 0 }  // 左
        ];

        for (const dir of directions) {
            const newX = point.x + dir.x;
            const newY = point.y + dir.y;

            if (
                newX >= 0 && newX < this.gridSize &&
                newY >= 0 && newY < this.gridSize &&
                this.grid[newY][newX] !== 1
            ) {
                neighbors.push({ x: newX, y: newY });
            }
        }

        return neighbors;
    }

    // 绘制搜索路径
    drawSearchPath(searchPath, color) {
        if (!searchPath || searchPath.length === 0) return;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]); // 设置虚线样式
        
        for (const segment of searchPath) {
            this.ctx.beginPath();
            this.ctx.moveTo(
                segment.from.x * this.cellSize + this.cellSize / 2,
                segment.from.y * this.cellSize + this.cellSize / 2
            );
            this.ctx.lineTo(
                segment.to.x * this.cellSize + this.cellSize / 2,
                segment.to.y * this.cellSize + this.cellSize / 2
            );
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]); // 恢复实线
    }

    // 动画方式绘制路径
    async animatePath(path, color, searchPath = [], showSearchPath = true, keepPaths = false) {
        if (!path) return;
        
        let currentPath = [];
        
        // 只有在需要时才绘制搜索路径
        if (showSearchPath) {
            this.drawSearchPath(searchPath, color);
        }
        
        // 绘制最终路径
        for (let i = 0; i < path.length; i++) {
            currentPath.push(path[i]);
            
            if (!keepPaths) {
                this.draw();
                if (showSearchPath) {
                    this.drawSearchPath(searchPath, color);
                }
            }
            
            // 绘制当前确认的路径
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([]); // 确保是实线
            this.ctx.beginPath();
            this.ctx.moveTo(
                this.start.x * this.cellSize + this.cellSize / 2,
                this.start.y * this.cellSize + this.cellSize / 2
            );

            for (const point of currentPath) {
                this.ctx.lineTo(
                    point.x * this.cellSize + this.cellSize / 2,
                    point.y * this.cellSize + this.cellSize / 2
                );
            }
            
            this.ctx.stroke();
            
            const prev = i === 0 ? this.start : path[i - 1];
            const current = path[i];
            const next = i < path.length - 1 ? path[i + 1] : null;
            const delay = this.isCorner(prev, current, next) ? 200 : 100;
            
            // 检查是否应该继续动画
            if (this.isAnimationStopped) {
                return;
            }
            
            await new Promise(resolve => {
                this.currentAnimation = setTimeout(resolve, delay);
            });
        }
    }

    findPathGreedy() {
        const path = [];
        const searchPath = [];
        let current = { ...this.start };
        const visited = new Set();
        visited.add(`${current.x},${current.y}`);

        while (current.x !== this.food.x || current.y !== this.food.y) {
            const neighbors = this.getNeighbors(current).filter(
                n => !visited.has(`${n.x},${n.y}`)
            );
            
            // 记录所有探索的路径
            for (const neighbor of neighbors) {
                searchPath.push({ from: current, to: neighbor });
            }
            
            if (neighbors.length === 0) {
                if (path.length === 0) return { path: null, searchPath };
                current = path.pop();
                continue;
            }

            const neighborDistances = neighbors.map(n => ({
                neighbor: n,
                distance: this.manhattanDistance(n, this.food)
            }));

            neighborDistances.sort((a, b) => a.distance - b.distance);
            const bestNeighbor = neighborDistances[0].neighbor;
            path.push(bestNeighbor);
            current = bestNeighbor;
            visited.add(`${current.x},${current.y}`);

            if (path.length > this.gridSize * this.gridSize) {
                return { path: null, searchPath };
            }
        }

        return { path, searchPath };
    }

    findPathDFS() {
        const path = [];
        const searchPath = [];
        const visited = new Set();
        const stack = [{ point: this.start, parent: null }];
        const parentMap = new Map();

        while (stack.length > 0) {
            const { point, parent } = stack.pop();
            const key = `${point.x},${point.y}`;

            if (visited.has(key)) continue;
            visited.add(key);
            
            if (parent) {
                searchPath.push({ from: parent, to: point });
            }

            if (point.x === this.food.x && point.y === this.food.y) {
                let current = point;
                while (current && (current.x !== this.start.x || current.y !== this.start.y)) {
                    path.unshift(current);
                    current = parentMap.get(`${current.x},${current.y}`);
                }
                return { path, searchPath };
            }

            const neighbors = this.getNeighbors(point);
            for (const neighbor of neighbors) {
                if (!visited.has(`${neighbor.x},${neighbor.y}`)) {
                    stack.push({ point: neighbor, parent: point });
                    parentMap.set(`${neighbor.x},${neighbor.y}`, point);
                }
            }
        }

        return { path: null, searchPath };
    }

    findPathBFS() {
        const path = [];
        const searchPath = [];
        const visited = new Set();
        const queue = [{ point: this.start, parent: null }];
        const parentMap = new Map();

        while (queue.length > 0) {
            const { point, parent } = queue.shift();
            const key = `${point.x},${point.y}`;

            if (visited.has(key)) continue;
            visited.add(key);
            
            if (parent) {
                searchPath.push({ from: parent, to: point });
            }

            if (point.x === this.food.x && point.y === this.food.y) {
                let current = point;
                while (current && (current.x !== this.start.x || current.y !== this.start.y)) {
                    path.unshift(current);
                    current = parentMap.get(`${current.x},${current.y}`);
                }
                return { path, searchPath };
            }

            const neighbors = this.getNeighbors(point);
            for (const neighbor of neighbors) {
                if (!visited.has(`${neighbor.x},${neighbor.y}`)) {
                    queue.push({ point: neighbor, parent: point });
                    parentMap.set(`${neighbor.x},${neighbor.y}`, point);
                }
            }
        }

        return { path: null, searchPath };
    }

    findPathAStar() {
        const path = [];
        const searchPath = [];
        const openSet = [this.start];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(`${this.start.x},${this.start.y}`, 0);
        fScore.set(`${this.start.x},${this.start.y}`, this.manhattanDistance(this.start, this.food));

        while (openSet.length > 0) {
            let current = openSet[0];
            let lowestFScore = fScore.get(`${current.x},${current.y}`);
            
            for (let i = 1; i < openSet.length; i++) {
                const f = fScore.get(`${openSet[i].x},${openSet[i].y}`);
                if (f < lowestFScore) {
                    current = openSet[i];
                    lowestFScore = f;
                }
            }

            if (current.x === this.food.x && current.y === this.food.y) {
                let temp = current;
                path.unshift(temp);
                while (cameFrom.has(`${temp.x},${temp.y}`)) {
                    temp = cameFrom.get(`${temp.x},${temp.y}`);
                    path.unshift(temp);
                }
                path.shift();
                return { path, searchPath };
            }

            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(`${current.x},${current.y}`);

            for (const neighbor of this.getNeighbors(current)) {
                searchPath.push({ from: current, to: neighbor });
                
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

                const tentativeGScore = gScore.get(`${current.x},${current.y}`) + 1;

                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(`${neighbor.x},${neighbor.y}`)) {
                    continue;
                }

                cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
                gScore.set(`${neighbor.x},${neighbor.y}`, tentativeGScore);
                fScore.set(
                    `${neighbor.x},${neighbor.y}`,
                    gScore.get(`${neighbor.x},${neighbor.y}`) + this.manhattanDistance(neighbor, this.food)
                );
            }
        }

        return { path: null, searchPath };
    }

    findPathDijkstra() {
        const path = [];
        const searchPath = [];
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] !== 1) {
                    const key = `${x},${y}`;
                    distances.set(key, Infinity);
                    unvisited.add(key);
                }
            }
        }
        
        distances.set(`${this.start.x},${this.start.y}`, 0);
        
        while (unvisited.size > 0) {
            let minDistance = Infinity;
            let current = null;
            
            for (const key of unvisited) {
                const distance = distances.get(key);
                if (distance < minDistance) {
                    minDistance = distance;
                    current = key;
                }
            }
            
            if (!current || minDistance === Infinity) break;
            
            const [x, y] = current.split(',').map(Number);
            const currentPoint = { x, y };
            unvisited.delete(current);
            
            if (x === this.food.x && y === this.food.y) {
                let currentPoint = { x, y };
                while (currentPoint && (currentPoint.x !== this.start.x || currentPoint.y !== this.start.y)) {
                    path.unshift(currentPoint);
                    currentPoint = previous.get(`${currentPoint.x},${currentPoint.y}`);
                }
                return { path, searchPath };
            }
            
            const neighbors = this.getNeighbors(currentPoint);
            for (const neighbor of neighbors) {
                searchPath.push({ from: currentPoint, to: neighbor });
                
                const key = `${neighbor.x},${neighbor.y}`;
                if (!unvisited.has(key)) continue;
                
                const distance = distances.get(current) + 1;
                if (distance < distances.get(key)) {
                    distances.set(key, distance);
                    previous.set(key, currentPoint);
                }
            }
        }
        
        return { path: null, searchPath };
    }

    // 判断是否转弯
    isCorner(prev, current, next) {
        if (!prev || !next) return false;
        return (prev.x !== next.x) && (prev.y !== next.y);
    }

    // 停止当前动画
    stopCurrentAnimation() {
        this.isAnimationStopped = true;
        if (this.currentAnimation) {
            clearTimeout(this.currentAnimation);
            this.currentAnimation = null;
        }
    }

    addEventListeners() {
        document.getElementById('greedyBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            const { path, searchPath } = this.findPathGreedy();
            this.draw();
            await this.animatePath(path, '#4CAF50', searchPath, true, false);
        });

        document.getElementById('astarBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            const { path, searchPath } = this.findPathAStar();
            this.draw();
            await this.animatePath(path, '#2196F3', searchPath, true, false);
        });

        document.getElementById('dfsBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            const { path, searchPath } = this.findPathDFS();
            this.draw();
            await this.animatePath(path, '#FF9800', searchPath, true, false);
        });

        document.getElementById('bfsBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            const { path, searchPath } = this.findPathBFS();
            this.draw();
            await this.animatePath(path, '#9C27B0', searchPath, true, false);
        });

        document.getElementById('dijkstraBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            const { path, searchPath } = this.findPathDijkstra();
            this.draw();
            await this.animatePath(path, '#795548', searchPath, true, false);
        });

        document.getElementById('compareBtn').addEventListener('click', async () => {
            this.isAnimationStopped = false;
            this.draw();
            const algorithms = [
                { fn: () => this.findPathGreedy(), color: '#4CAF50' },
                { fn: () => this.findPathAStar(), color: '#2196F3' },
                { fn: () => this.findPathDFS(), color: '#FF9800' },
                { fn: () => this.findPathBFS(), color: '#9C27B0' },
                { fn: () => this.findPathDijkstra(), color: '#795548' }
            ];
            
            const results = algorithms.map(({ fn, color }) => {
                const { path, searchPath } = fn();
                return { path, searchPath, color };
            });
            
            await Promise.all(
                results.map(({ path, searchPath, color }) => 
                    this.animatePath(path, color, searchPath, false, true) // 不显示搜索路径，但保持路径显示
                )
            );
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.stopCurrentAnimation();
            this.generateMap();
        });
    }
}

// 初始化应用
window.onload = () => {
    new PathFinding();
}; 