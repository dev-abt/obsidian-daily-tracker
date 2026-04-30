function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
	return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

export function renderScoreChart(
	container: HTMLElement,
	data: { date: Date; score: number }[]
): void {
	container.empty();

	if (data.length === 0) {
		container.createEl('p', { text: 'No scored days in this period.', cls: 'tracker-empty' });
		return;
	}

	const W = 580, H = 160;
	const PAD = { top: 12, right: 12, bottom: 20, left: 28 };
	const chartW = W - PAD.left - PAD.right;
	const chartH = H - PAD.top - PAD.bottom;

	const xScale = (i: number) =>
		data.length === 1
			? PAD.left + chartW / 2
			: PAD.left + (i / (data.length - 1)) * chartW;

	const yScale = (v: number) =>
		PAD.top + chartH - ((v - 1) / 9) * chartH;

	const svg = svgEl('svg');
	svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
	svg.setAttribute('class', 'tracker-chart');

	// Grid lines at 2, 4, 6, 8, 10
	for (const y of [2, 4, 6, 8, 10]) {
		const cy = yScale(y);

		const line = svgEl('line');
		line.setAttribute('x1', String(PAD.left));
		line.setAttribute('x2', String(W - PAD.right));
		line.setAttribute('y1', String(cy));
		line.setAttribute('y2', String(cy));
		line.setAttribute('class', 'tracker-grid-line');
		svg.appendChild(line);

		const label = svgEl('text');
		label.setAttribute('x', String(PAD.left - 4));
		label.setAttribute('y', String(cy + 4));
		label.setAttribute('class', 'tracker-axis-label');
		label.setAttribute('text-anchor', 'end');
		label.textContent = String(y);
		svg.appendChild(label);
	}

	// Line path
	if (data.length > 1) {
		const d = data.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(pt.score)}`).join(' ');
		const path = svgEl('path');
		path.setAttribute('d', d);
		path.setAttribute('class', 'tracker-line');
		svg.appendChild(path);
	}

	// Points
	for (let i = 0; i < data.length; i++) {
		const pt = data[i];
		if (!pt) continue;
		const circle = svgEl('circle');
		circle.setAttribute('cx', String(xScale(i)));
		circle.setAttribute('cy', String(yScale(pt.score)));
		circle.setAttribute('r', '4');
		circle.setAttribute('class', 'tracker-point');

		const title = svgEl('title');
		title.textContent = `${pt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${pt.score}`;
		circle.appendChild(title);

		svg.appendChild(circle);
	}

	container.appendChild(svg);
}

export function renderPeopleChart(
	container: HTMLElement,
	counts: [string, number][]
): void {
	container.empty();

	const top = counts.slice(0, 10);
	if (top.length === 0) {
		container.createEl('p', { text: 'No interactions found.', cls: 'tracker-empty' });
		return;
	}

	const barH = 22, gap = 5;
	const labelW = 110, countW = 32, paddingRight = 8;
	const W = 580;
	const H = top.length * (barH + gap) + gap;
	const maxBarW = W - labelW - countW - paddingRight;
	const maxCount = Math.max(...top.map(([, c]) => c));

	const svg = svgEl('svg');
	svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
	svg.setAttribute('class', 'tracker-chart');

	for (let i = 0; i < top.length; i++) {
		const entry = top[i];
		if (!entry) continue;
		const [person, count] = entry;
		const y = i * (barH + gap) + gap;
		const barW = Math.max(4, (maxBarW * count) / maxCount);

		const label = svgEl('text');
		label.setAttribute('x', String(labelW - 6));
		label.setAttribute('y', String(y + barH / 2));
		label.setAttribute('class', 'tracker-axis-label');
		label.setAttribute('text-anchor', 'end');
		label.setAttribute('dominant-baseline', 'middle');
		label.textContent = person;
		svg.appendChild(label);

		const rect = svgEl('rect');
		rect.setAttribute('x', String(labelW));
		rect.setAttribute('y', String(y));
		rect.setAttribute('width', String(barW));
		rect.setAttribute('height', String(barH));
		rect.setAttribute('rx', '3');
		rect.setAttribute('class', 'tracker-bar');
		svg.appendChild(rect);

		const countLabel = svgEl('text');
		countLabel.setAttribute('x', String(labelW + barW + 5));
		countLabel.setAttribute('y', String(y + barH / 2));
		countLabel.setAttribute('class', 'tracker-count-label');
		countLabel.setAttribute('dominant-baseline', 'middle');
		countLabel.textContent = String(count);
		svg.appendChild(countLabel);
	}

	container.appendChild(svg);
}
