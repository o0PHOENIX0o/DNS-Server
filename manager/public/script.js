const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const width = window.innerWidth;
const mobileWidth = 450;
console.log(width)
const particleCount = (width < mobileWidth) ? 30 : 70;
const mouse = {
    x: null,
    y: null
};

class Particle {
    constructor(options={}) {
        this.x = options.x ?? Math.random() * canvas.width;
        this.y = options.y ?? Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = options.opacity ?? Math.random() * 0.5 + 0.2;
        this.color = Math.random() > 0.5 ? '#00ff88' : '#00ccff';
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function initParticles() {
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function drawConnections(options = {}) {
    if(options.x !== undefined && options.y !== undefined) {
        particles.sort( (a,b) => {
            const da = (a.x - options.x) ** 2 + (a.y - options.y) ** 2;
            const db = (b.x - options.x) ** 2 + (b.y - options.y) ** 2;
            return da - db;
        } );
        const closest = particles.slice(0, 10);
        console.log(closest);
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < closest.length; i++) {
            ctx.strokeStyle = closest[i].color;
            ctx.beginPath();
            ctx.moveTo(closest[i].x, closest[i].y);
            ctx.lineTo(options.x, options.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 250) {
                ctx.strokeStyle = particles[i].color;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    if (mouse.x !== null) {
        drawConnections({ x: mouse.x, y: mouse.y });
    } else {
        drawConnections();
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

initParticles();
animate();

window.addEventListener('click', (e) => {
    particles.push(new Particle({x: e.clientX, y: e.clientY, opacity:0.5}) );
    if(particles.length > particleCount) {
        particles.shift();
    }
} );

// window.addEventListener('mousemove', (e) => {
//     const rect = canvas.getBoundingClientRect();
//     mouse.x = e.clientX - rect.left;
//     mouse.y = e.clientY - rect.top;
//     console.log(mouse);
// });


// ----------------------------------------------------------------------------------------------------

// ==============================
// Server request functions
// ==============================

async function fetchBlockedDomains() {
    const res = await fetch('/domains');
    console.log("fetch res: ", res);
    return res.json();
}

async function addBlockedDomain(domain) {
    const res = await fetch('/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
    });
    return res.json();
}

async function updateBlockedDomain(id, newDomain) {
    const res = await fetch(`/domains/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({domain: newDomain})
    });
    return res.json();
}

async function deleteBlockedDomain(id) {
    const res = await fetch(`/domains/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    return res.json();
}

// ==============================
// Application state
// ==============================

let blockedDomains = [];
let editingId = null;
const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,6}$/;


// ==============================
// DOM elements
// ==============================

const domainForm = document.getElementById('addDomainForm');
const domainInput = document.getElementById('domainInput');
const domainsList = document.getElementById('domainsList');

// ==============================
// Initialize app
// ==============================

async function initApp() {
    try{
        blockedDomains = await fetchBlockedDomains();
        console.log("Initial domains: ", blockedDomains);
        renderDomainsList();
    } catch (error) {
        console.error('Error initializing app:', error);    
    }
}

function renderDomainsList() {
    console.log("Rendering domains: ", blockedDomains, " editingId: ", editingId);
    if (blockedDomains.length === 0) {
        domainsList.innerHTML =
            '<li class="empty-state">No blocked domains yet</li>';
        return;
    }

    domainsList.innerHTML = blockedDomains.map(({id, domain}) => {
        if (editingId === id) {
            return `
                <li class="domain-item edit-mode" data-id="${id}" data-domain="${domain}">
                    <input type="text" class="edit-input" id="editInput" value="${domain}">
                    <button class="btn btn-secondary save-btn">Save</button>
                    <button class="btn btn-danger cancel-btn">Cancel</button>
                </li>
            `;
        }

        return `
            <li class="domain-item" data-id="${id}" data-domain="${domain}">
                <span class="domain-name">${domain}</span>
                <div class="domain-actions">
                    <button class="btn btn-secondary edit-btn">Edit</button>
                    <button class="btn btn-danger delete-btn">Delete</button>
                </div>
            </li>
        `;
    }).join('');
}



domainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const domain = domainInput.value.trim();
    if (!domain) return;

    if (blockedDomains.includes(domain)) {
        alert('Domain already blocked');
        return;
    }

    if (!domainRegex.test(domain)) {
        alert('Invalid domain format');
        return;
    }

    const response = await addBlockedDomain(domain);
    if(response.error){
        alert(`Error: ${response.error}`);
        return;
    }
    blockedDomains = response;
    domainInput.value = '';
    renderDomainsList();
});


domainsList.addEventListener('click', async (e) => {
    const item = e.target.closest('.domain-item');
    if (!item) return;

    const domain = item.dataset.domain;

    // Edit
    if (e.target.classList.contains('edit-btn')) {
        editingId = item.dataset.id;
        renderDomainsList();
    }

    // Save
    if (e.target.classList.contains('save-btn')) {
        const newDomain = document.getElementById('editInput').value.trim();
        const id = item.dataset.id;
        console.log("new val: ", newDomain);
        if (!newDomain) return;

        blockedDomains = await updateBlockedDomain(id, newDomain);
        editingId = null;
        renderDomainsList();
    }

    // Cancel
    if (e.target.classList.contains('cancel-btn')) {
        editingId = null;
        renderDomainsList();
    }

    // Delete
    if (e.target.classList.contains('delete-btn')) {
        if (!confirm(`Delete ${domain}?`)) return;
        blockedDomains = await deleteBlockedDomain(item.dataset.id);
        renderDomainsList();
    }
});

document.addEventListener('DOMContentLoaded', initApp);
