import * as THREE from "three";

const canvas = document.querySelector("#scene");
const speedDisplay = document.querySelector("#speed");
const heightDisplay = document.querySelector("#height");
const speedMeter = document.querySelector("#speed-meter");
const crosshair = document.querySelector("#crosshair");
const notice = document.querySelector("#notice");
const missionPicker = document.querySelector(".mission-picker");
const missionHud = document.querySelector("#mission-hud");
const missionName = document.querySelector("#mission-name");
const missionObjective = document.querySelector("#mission-objective");
const missionProgress = document.querySelector("#mission-progress");
const missionDetail = document.querySelector("#mission-detail");
const missionTimer = document.querySelector("#mission-timer");
const missionCancel = document.querySelector("#mission-cancel");
const fightHealth = document.querySelector("#fight-health");
const healthValue = document.querySelector("#health-value");

if (!(canvas instanceof HTMLCanvasElement)
	|| !(speedDisplay instanceof HTMLElement)
	|| !(heightDisplay instanceof HTMLElement)
	|| !(speedMeter instanceof HTMLElement)
	|| !(crosshair instanceof HTMLElement)
	|| !(notice instanceof HTMLElement)
	|| !(missionPicker instanceof HTMLElement)
	|| !(missionHud instanceof HTMLElement)
	|| !(missionName instanceof HTMLElement)
	|| !(missionObjective instanceof HTMLElement)
	|| !(missionProgress instanceof HTMLElement)
	|| !(missionDetail instanceof HTMLElement)
	|| !(missionTimer instanceof HTMLElement)
	|| !(missionCancel instanceof HTMLButtonElement)
	|| !(fightHealth instanceof HTMLElement)
	|| !(healthValue instanceof HTMLElement)) {
	throw new Error("A interface da demo não foi carregada corretamente.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);
scene.fog = new THREE.FogExp2(0x111827, 0.0045);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 8, 14);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight(0xb9d5ff, 0x252a39, 2.1));
const moonlight = new THREE.DirectionalLight(0xc5d7ff, 2.4);
moonlight.position.set(-22, 48, 18);
scene.add(moonlight);
const cityGlow = new THREE.PointLight(0xff795d, 120, 110);
cityGlow.position.set(0, 18, -25);
scene.add(cityGlow);

const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(250, 400),
	new THREE.MeshStandardMaterial({ color: 0x252b39, roughness: 0.94 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.12, -75);
scene.add(ground);

const road = new THREE.Mesh(
	new THREE.PlaneGeometry(22, 400),
	new THREE.MeshStandardMaterial({ color: 0x171d2a, roughness: 0.9 }),
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.1, -75);
scene.add(road);

const roadMarkings = new THREE.Group();
const markingMaterial = new THREE.MeshBasicMaterial({ color: 0x677080, transparent: true, opacity: 0.38 });
for (let z = 100; z > -270; z -= 12) {
	const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 5), markingMaterial);
	dash.position.set(0, -0.075, z);
	roadMarkings.add(dash);
}
scene.add(roadMarkings);

const buildings = [];
const buildingMeshes = [];
const buildingColors = [0x30394a, 0x384052, 0x343b4b, 0x414353, 0x303849, 0x464653];
const windowMaterials = [
	new THREE.MeshBasicMaterial({ color: 0xf7bd78 }),
	new THREE.MeshBasicMaterial({ color: 0x9ec9de }),
	new THREE.MeshBasicMaterial({ color: 0x667895 }),
];
const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
const windowGeometry = new THREE.BoxGeometry(0.7, 0.85, 0.08);
let seed = 481516;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return (seed - 1) / 2147483646;
};

function createBuilding(x, z) {
	const width = 8 + random() * 5;
	const depth = 9 + random() * 6;
	const height = 15 + random() * 31;
	const body = new THREE.Mesh(
		buildingGeometry,
		new THREE.MeshStandardMaterial({
			color: buildingColors[Math.floor(random() * buildingColors.length)],
			roughness: 0.8,
			metalness: 0.12,
		}),
	);
	body.position.set(x, height / 2, z);
	body.scale.set(width, height, depth);
	body.userData.isBuilding = true;
	scene.add(body);
	buildingMeshes.push(body);

	const roof = new THREE.Mesh(
		new THREE.BoxGeometry(width + 0.18, 0.36, depth + 0.18),
		new THREE.MeshStandardMaterial({ color: 0x586276, roughness: 0.82 }),
	);
	roof.position.set(x, height + 0.12, z);
	scene.add(roof);

	const windowGroup = new THREE.Group();
	for (let floor = 2; floor < height - 2; floor += 3.2) {
		for (let col = -width / 2 + 1.2; col < width / 2 - 0.5; col += 1.7) {
			if (random() < 0.23) continue;
			const windowMesh = new THREE.Mesh(windowGeometry, windowMaterials[Math.floor(random() * windowMaterials.length)]);
			windowMesh.position.set(x + col, floor, z + depth / 2 + 0.045);
			windowGroup.add(windowMesh);
		}
	}
	scene.add(windowGroup);
	buildings.push({ x, z, width, depth, height });
}

for (const x of [-26, -13, 13, 26]) {
	for (let z = -120; z <= 100; z += 20) createBuilding(x, z);
}
for (const x of [-45, 45]) {
	for (let z = -120; z <= 100; z += 24) createBuilding(x, z);
}

const rooftopLights = new THREE.Group();
const beaconGeometry = new THREE.SphereGeometry(0.12, 8, 6);
const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff8063 });
for (const building of buildings) {
	if (random() < 0.55) continue;
	const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
	beacon.position.set(building.x, building.height + 0.4, building.z);
	rooftopLights.add(beacon);
}
scene.add(rooftopLights);

const hero = new THREE.Group();
const suitMaterial = new THREE.MeshStandardMaterial({ color: 0x168f94, roughness: 0.56, metalness: 0.15 });
const darkSuitMaterial = new THREE.MeshStandardMaterial({ color: 0x172738, roughness: 0.66 });
const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xff966f, roughness: 0.5, emissive: 0x35120b });
const maskMaterial = new THREE.MeshStandardMaterial({ color: 0xdde8e6, roughness: 0.4, metalness: 0.12 });
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x13222e, roughness: 0.32 });

function capsule(parent, material, radius, length, position, rotation = [0, 0, 0]) {
	const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material);
	mesh.position.set(...position);
	mesh.rotation.set(...rotation);
	parent.add(mesh);
	return mesh;
}

capsule(hero, suitMaterial, 0.39, 0.72, [0, 1.37, 0]);
const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.13, 0.12), accentMaterial);
chestStripe.position.set(0, 1.56, -0.365);
hero.add(chestStripe);
capsule(hero, maskMaterial, 0.3, 0.2, [0, 2.05, 0]);
for (const side of [-1, 1]) {
	const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeMaterial);
	eye.scale.set(0.68, 1, 0.26);
	eye.position.set(side * 0.12, 2.07, -0.267);
	hero.add(eye);
	capsule(hero, darkSuitMaterial, 0.14, 0.48, [side * 0.52, 1.45, 0], [0, 0, -side * 0.22]);
	capsule(hero, suitMaterial, 0.17, 0.55, [side * 0.18, 0.56, 0], [0, 0, -side * 0.06]);
}
const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.11, 0.46), accentMaterial);
belt.position.set(0, 1.03, 0);
hero.add(belt);
hero.position.set(0, 1, 0);
scene.add(hero);

const missionMarkers = new THREE.Group();
scene.add(missionMarkers);
const gateGeometry = new THREE.TorusGeometry(2.2, 0.12, 8, 28);
const gateMaterial = new THREE.MeshBasicMaterial({ color: 0xffa176 });
const gateActiveMaterial = new THREE.MeshBasicMaterial({ color: 0x83ead0 });
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0x76536a, roughness: 0.7 });
const enemyAccentMaterial = new THREE.MeshStandardMaterial({ color: 0xd99a66, roughness: 0.55 });
const enemyMeshes = [];
let mission = null;

function clearMissionActors() {
	for (const mesh of enemyMeshes.splice(0)) {
		scene.remove(mesh);
		mesh.traverse((child) => {
			if (child instanceof THREE.Mesh) child.geometry.dispose();
		});
	}
	for (const child of [...missionMarkers.children]) {
		missionMarkers.remove(child);
		if (child.geometry !== gateGeometry) child.geometry.dispose();
	}
	if (mission?.target) {
		scene.remove(mission.target);
		mission.target.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
				else child.material.dispose();
			}
		});
		mission.target = null;
	}
}

function createEnemy(position) {
	const enemy = new THREE.Group();
	capsule(enemy, enemyMaterial, 0.36, 0.72, [0, 1.32, 0]);
	capsule(enemy, enemyAccentMaterial, 0.26, 0.18, [0, 1.98, 0]);
	for (const side of [-1, 1]) {
		capsule(enemy, enemyMaterial, 0.13, 0.48, [side * 0.48, 1.35, 0], [0, 0, -side * 0.2]);
		capsule(enemy, enemyMaterial, 0.16, 0.5, [side * 0.17, 0.54, 0], [0, 0, -side * 0.06]);
	}
	enemy.position.set(position.x, 0, position.z);
	scene.add(enemy);
	enemyMeshes.push(enemy);
	return { mesh: enemy, hits: 0, attackCooldown: 0 };
}

function createPursuitTarget(position) {
	const vehicle = new THREE.Group();
	const body = new THREE.Mesh(
		new THREE.BoxGeometry(2.1, 1.05, 3.4),
		new THREE.MeshStandardMaterial({ color: 0x8c514d, roughness: 0.58, metalness: 0.2 }),
	);
	body.position.y = 0.8;
	vehicle.add(body);
	const cabin = new THREE.Mesh(
		new THREE.BoxGeometry(1.55, 0.72, 1.65),
		new THREE.MeshStandardMaterial({ color: 0xa8bbc1, roughness: 0.35, metalness: 0.25 }),
	);
	cabin.position.set(0, 1.63, -0.15);
	vehicle.add(cabin);
	const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.9 });
	for (const side of [-1, 1]) {
		for (const z of [-1, 1]) {
			const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12), wheelMaterial);
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set(side * 1.08, 0.42, z * 1.05);
			vehicle.add(wheel);
		}
	}
	vehicle.position.set(position.x, 0, position.z);
	scene.add(vehicle);
	return vehicle;
}

function setMissionHud(name, objective, detail, timer = "") {
	missionName.textContent = name;
	missionObjective.textContent = objective;
	missionDetail.textContent = detail;
	missionTimer.textContent = timer;
}

function finishMission(success, message) {
	if (!mission || mission.status !== "active") return;
	mission.status = success ? "complete" : "failed";
	clearMissionActors();
	releaseWeb();
	missionPicker.hidden = true;
	missionHud.hidden = false;
	fightHealth.hidden = true;
	setMissionHud(
		success ? "MISSÃO CONCLUÍDA" : "MISSÃO ENCERRADA",
		message,
		success ? "Mandou bem — escolha outro desafio quando quiser." : "Tente novamente quando estiver pronto.",
	);
	missionProgress.style.width = success ? "100%" : `${Math.max(0, (mission.time / mission.duration) * 100)}%`;
	missionCancel.setAttribute("aria-label", "Voltar às missões");
	missionCancel.textContent = "×";
	showNotice(success ? "DESAFIO CONCLUÍDO" : "DESAFIO ENCERRADO", 2600);
}

function startMission(type) {
	clearMissionActors();
	releaseWeb();
	const duration = type === "agility" ? 65 : type === "fight" ? 75 : 55;
	mission = { type, status: "active", duration, time: duration };
	attackCooldown = 0;
	missionPicker.hidden = true;
	missionHud.hidden = false;
	missionCancel.setAttribute("aria-label", "Encerrar missão");
	missionCancel.textContent = "×";
	missionProgress.style.width = "0%";
	fightHealth.hidden = type !== "fight";

	if (type === "agility") {
		mission.gates = [
			new THREE.Vector3(0, 2.4, -20),
			new THREE.Vector3(-10, 7, -43),
			new THREE.Vector3(10, 3.4, -69),
			new THREE.Vector3(0, 10, -98),
		].map((position) => {
			const gate = new THREE.Mesh(gateGeometry, gateMaterial);
			if (missionMarkers.children.length === 0) gate.material = gateActiveMaterial;
			gate.rotation.x = Math.PI / 2;
			gate.position.copy(position);
			missionMarkers.add(gate);
			return gate;
		});
		mission.gateIndex = 0;
		setMissionHud("CORRIDA CONTRA O TEMPO", "Atravesse todos os pontos", "Ponto 1 de 4", `${duration}s`);
		showNotice("ATRAVESSE OS ARCOS VERDES ANTES QUE O TEMPO ACABE", 3000);
	} else if (type === "fight") {
		mission.enemies = [
			createEnemy(hero.position.clone().add(new THREE.Vector3(-4, -1, -3))),
			createEnemy(hero.position.clone().add(new THREE.Vector3(4, -1, -5))),
			createEnemy(hero.position.clone().add(new THREE.Vector3(0, -1, -8))),
		];
		mission.playerHealth = 3;
		mission.invulnerability = 0;
		healthValue.textContent = "♥ ♥ ♥";
		setMissionHud("CONFRONTO COM CAPANGAS", "Afaste os capangas", "3 adversários restantes", `${duration}s`);
		showNotice("APROXIME-SE E PRESSIONE F PARA GOLPEAR", 3000);
	} else {
		mission.target = createPursuitTarget(hero.position.clone().add(new THREE.Vector3(0, 0, -38)));
		mission.targetStartDistance = 38;
		mission.targetDirection = 1;
		const targetMarker = new THREE.Mesh(
			new THREE.TorusGeometry(2.2, 0.12, 8, 28),
			new THREE.MeshBasicMaterial({ color: 0x83ead0 }),
		);
		targetMarker.rotation.x = Math.PI / 2;
		targetMarker.position.y = 3;
		mission.target.add(targetMarker);
		setMissionHud("PERSEGUIÇÃO", "Alcance o veículo", "Alvo a 38 m", `${duration}s`);
		showNotice("ALCANCE O VEÍCULO — USE O GANCHO PARA GANHAR ALTURA", 3000);
	}
}

for (const button of missionPicker.querySelectorAll("[data-mission]")) {
	button.addEventListener("click", () => {
		const type = button.getAttribute("data-mission");
		if (type === "agility" || type === "fight" || type === "chase") startMission(type);
	});
}

missionCancel.addEventListener("click", () => {
	if (mission?.status === "active") {
		clearMissionActors();
		releaseWeb();
		mission = null;
		missionHud.hidden = true;
		missionPicker.hidden = false;
		fightHealth.hidden = true;
		showNotice("MISSÃO CANCELADA");
		return;
	}
	clearMissionActors();
	mission = null;
	missionHud.hidden = true;
	missionPicker.hidden = false;
	fightHealth.hidden = true;
});

const webMaterial = new THREE.LineBasicMaterial({ color: 0xf5f5e9, transparent: true, opacity: 0.9 });
let webLine = null;
let anchor = null;
let ropeLength = 0;
let noticeTimer = 0;
let attackCooldown = 0;
const velocity = new THREE.Vector3();
const moveInput = new THREE.Vector3();
const keys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const cameraForward = new THREE.Vector3(0, 0, -1);
const cameraRight = new THREE.Vector3(1, 0, 0);
const cameraTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const clock = new THREE.Clock();

function showNotice(message, duration = 1800) {
	notice.textContent = message;
	notice.classList.add("visible");
	window.clearTimeout(noticeTimer);
	noticeTimer = window.setTimeout(() => notice.classList.remove("visible"), duration);
}

function releaseWeb() {
	if (!anchor) return;
	anchor = null;
	if (webLine) {
		scene.remove(webLine);
		webLine.geometry.dispose();
		webLine = null;
	}
	velocity.y += 2.4;
	showNotice("GANCHO SOLTO — SIGA O IMPULSO");
}

function aimWeb(event) {
	if (anchor) {
		releaseWeb();
		return;
	}
	const bounds = canvas.getBoundingClientRect();
	pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
	pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
	raycaster.setFromCamera(pointer, camera);
	const hit = raycaster.intersectObjects(buildingMeshes, false)[0];
	if (!hit || hit.distance > 85) {
		showNotice("MIRE EM UM PRÉDIO MAIS PRÓXIMO");
		return;
	}
	if (webLine) {
		scene.remove(webLine);
		webLine.geometry.dispose();
	}
	anchor = hit.point.clone();
	ropeLength = Math.max(5, hero.position.distanceTo(anchor) * 0.91);
	webLine = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints([hero.position.clone().add(new THREE.Vector3(0, 1.8, 0)), anchor]),
		webMaterial,
	);
	scene.add(webLine);
	showNotice("GANCHO CONECTADO — SOLTE PARA GANHAR IMPULSO", 2200);
}

canvas.addEventListener("pointerdown", (event) => {
	if (event.button === 0) aimWeb(event);
});
window.addEventListener("keydown", (event) => {
	if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
	if (event.repeat) return;
	keys.add(event.code);
	if (event.code === "Escape") releaseWeb();
	if (event.code === "Space" && hero.position.y <= 1.08) velocity.y = 8.4;
	if (event.code === "KeyF") attackEnemy();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
canvas.addEventListener("pointermove", (event) => {
	pointer.x = ((event.clientX / window.innerWidth) * 2) - 1;
	pointer.y = -((event.clientY / window.innerHeight) * 2) + 1;
	raycaster.setFromCamera(pointer, camera);
	const hit = raycaster.intersectObjects(buildingMeshes, false)[0];
	crosshair.classList.toggle("active", Boolean(hit && hit.distance < 85));
});

function attackEnemy() {
	if (mission?.type !== "fight" || mission.status !== "active" || attackCooldown > 0) return;
	const target = mission.enemies
		.filter((enemy) => enemy.hits < 2)
		.sort((first, second) => first.mesh.position.distanceTo(hero.position) - second.mesh.position.distanceTo(hero.position))[0];
	if (!target || target.mesh.position.distanceTo(hero.position) > 3.8) {
		showNotice("APROXIME-SE DE UM ADVERSÁRIO");
		return;
	}
	attackCooldown = 0.48;
	target.hits += 1;
	const push = target.mesh.position.clone().sub(hero.position);
	push.y = 0;
	if (push.lengthSq() > 0) target.mesh.position.addScaledVector(push.normalize(), 2.1);
	if (target.hits >= 2) {
		scene.remove(target.mesh);
		target.mesh.traverse((child) => {
			if (child instanceof THREE.Mesh) child.geometry.dispose();
		});
		const enemyIndex = enemyMeshes.indexOf(target.mesh);
		if (enemyIndex >= 0) enemyMeshes.splice(enemyIndex, 1);
		mission.enemies = mission.enemies.filter((enemy) => enemy !== target);
	}
	if (mission.enemies.length === 0) {
		finishMission(true, "Área protegida");
		return;
	}
	setMissionHud(
		"CONFRONTO COM CAPANGAS",
		"Afaste os capangas",
		`${mission.enemies.length} adversários restantes`,
		`${Math.ceil(mission.time)}s`,
	);
	showNotice(target.hits === 1 ? "GOLPE CERTEIRO — MAIS UM PARA AFASTAR" : "ADVERSÁRIO AFASTADO");
}

function updateMission(delta) {
	if (!mission || mission.status !== "active") return;
	mission.time -= delta;
	if (mission.time <= 0) {
		finishMission(false, "O tempo acabou");
		return;
	}
	attackCooldown = Math.max(0, attackCooldown - delta);

	if (mission.type === "agility") {
		const gate = mission.gates[mission.gateIndex];
		if (gate) {
			gate.rotation.z += delta * 1.2;
			if (hero.position.distanceTo(gate.position) < 4.5) {
				missionMarkers.remove(gate);
				mission.gateIndex += 1;
				const nextGate = mission.gates[mission.gateIndex];
				if (nextGate) nextGate.material = gateActiveMaterial;
				if (mission.gateIndex === mission.gates.length) {
					finishMission(true, "Percurso concluído a tempo");
					return;
				}
			}
		}
		const progress = mission.gateIndex / mission.gates.length;
		missionProgress.style.width = `${progress * 100}%`;
		setMissionHud(
			"CORRIDA CONTRA O TEMPO",
			"Atravesse todos os pontos",
			`Ponto ${Math.min(mission.gateIndex + 1, mission.gates.length)} de ${mission.gates.length}`,
			`${Math.ceil(mission.time)}s`,
		);
		return;
	}

	if (mission.type === "fight") {
		mission.invulnerability = Math.max(0, mission.invulnerability - delta);
		for (const enemy of mission.enemies) {
			const towardHero = hero.position.clone().sub(enemy.mesh.position);
			towardHero.y = 0;
			const distance = towardHero.length();
			if (distance > 1.55) {
				enemy.mesh.position.addScaledVector(towardHero.normalize(), Math.min(distance - 1.35, delta * 1.15));
				enemy.mesh.rotation.y = Math.atan2(-towardHero.x, -towardHero.z);
			} else if (mission.invulnerability === 0 && enemy.attackCooldown <= 0) {
				mission.playerHealth -= 1;
				mission.invulnerability = 1.1;
				enemy.attackCooldown = 1.6;
				healthValue.textContent = `${"♥ ".repeat(mission.playerHealth)}${"♡ ".repeat(3 - mission.playerHealth)}`.trim();
				showNotice("VOCÊ LEVOU UM GOLPE — AFASTE-SE");
				if (mission.playerHealth <= 0) {
					finishMission(false, "Você foi cercado");
					return;
				}
			}
			enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
		}
		missionProgress.style.width = `${((3 - mission.enemies.length) / 3) * 100}%`;
		setMissionHud(
			"CONFRONTO COM CAPANGAS",
			"Afaste os capangas",
			`${mission.enemies.length} adversários restantes`,
			`${Math.ceil(mission.time)}s`,
		);
		return;
	}

	const chaseTime = mission.duration - mission.time;
	mission.target.position.z -= delta * 7.5 * mission.targetDirection;
	if (mission.target.position.z < -140) mission.targetDirection = -1;
	if (mission.target.position.z > -30) mission.targetDirection = 1;
	mission.target.position.x = Math.sin(chaseTime * 0.8) * 3;
	const distance = Math.hypot(
		hero.position.x - mission.target.position.x,
		hero.position.z - mission.target.position.z,
	);
	const progress = THREE.MathUtils.clamp(1 - distance / mission.targetStartDistance, 0, 1);
	missionProgress.style.width = `${progress * 100}%`;
	setMissionHud("PERSEGUIÇÃO", "Alcance o veículo", `Alvo a ${Math.round(distance)} m`, `${Math.ceil(mission.time)}s`);
	if (distance < 4.5 && Math.abs(hero.position.y - mission.target.position.y) < 5) {
		finishMission(true, "Veículo alcançado");
	}
}

function update(delta) {
	const cameraDirection = new THREE.Vector3();
	camera.getWorldDirection(cameraDirection);
	cameraForward.set(cameraDirection.x, 0, cameraDirection.z).normalize();
	cameraRight.set(-cameraForward.z, 0, cameraForward.x);
	moveInput.set(0, 0, 0);
	if (keys.has("KeyW") || keys.has("ArrowUp")) moveInput.add(cameraForward);
	if (keys.has("KeyS") || keys.has("ArrowDown")) moveInput.sub(cameraForward);
	if (keys.has("KeyD") || keys.has("ArrowRight")) moveInput.add(cameraRight);
	if (keys.has("KeyA") || keys.has("ArrowLeft")) moveInput.sub(cameraRight);
	if (moveInput.lengthSq() > 0) {
		moveInput.normalize();
		velocity.x += moveInput.x * 18 * delta;
		velocity.z += moveInput.z * 18 * delta;
		const facingAngle = Math.atan2(-moveInput.x, -moveInput.z);
		hero.rotation.y = THREE.MathUtils.lerp(hero.rotation.y, facingAngle, Math.min(1, delta * 8));
	}

	velocity.y -= 17 * delta;
	const horizontalDrag = moveInput.lengthSq() > 0 ? 0.992 : 0.982;
	velocity.x *= Math.pow(horizontalDrag, delta * 60);
	velocity.z *= Math.pow(horizontalDrag, delta * 60);
	hero.position.addScaledVector(velocity, delta);

	if (anchor) {
		const ropeVector = hero.position.clone().sub(anchor);
		const distance = ropeVector.length();
		if (distance > ropeLength) {
			ropeVector.normalize();
			hero.position.copy(anchor).addScaledVector(ropeVector, ropeLength);
			const outwardSpeed = velocity.dot(ropeVector);
			if (outwardSpeed > 0) velocity.addScaledVector(ropeVector, -outwardSpeed);
		}
		const points = webLine.geometry.attributes.position;
		points.setXYZ(0, hero.position.x, hero.position.y + 1.8, hero.position.z);
		points.setXYZ(1, anchor.x, anchor.y, anchor.z);
		points.needsUpdate = true;
	}

	if (hero.position.y < 1) {
		hero.position.y = 1;
		if (velocity.y < 0) velocity.y = 0;
		if (anchor) releaseWeb();
	}
	hero.position.x = THREE.MathUtils.clamp(hero.position.x, -54, 54);
	if (hero.position.z > 110) hero.position.z = 110;
	hero.position.z = Math.max(hero.position.z, -175);
	updateMission(delta);

	const speed = Math.round(Math.hypot(velocity.x, velocity.z) * 9);
	speedDisplay.textContent = String(speed);
	heightDisplay.textContent = String(Math.max(0, Math.round((hero.position.y - 1) * 2)));
	speedMeter.style.width = `${Math.min(100, speed / 2.4)}%`;

	cameraTarget.set(hero.position.x, hero.position.y + 1.1, hero.position.z - 1.8);
	desiredCameraPosition.set(hero.position.x, hero.position.y + 6.2, hero.position.z + 12);
	camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-4 * delta));
	camera.lookAt(cameraTarget);
}

function animate() {
	const delta = Math.min(clock.getDelta(), 0.04);
	update(delta);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
	renderer.setSize(window.innerWidth, window.innerHeight);
});

showNotice("CLIQUE EM UM PRÉDIO PARA LANÇAR O GANCHO", 5000);
animate();
