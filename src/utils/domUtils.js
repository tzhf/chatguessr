export function qs(selector, parent = document) {
	return parent.querySelector(selector);
}

/**
 * @param {String} type
 * @param {Object} attributes
 * @param {String[]|HTMLElement[]} children
 */
export function createEl(type, attributes, ...children) {
	const el = document.createElement(type);
	for (const key in attributes) {
		el.setAttribute(key, attributes[key]);
	}
	children.forEach((child) => {
		if (typeof child === "string") {
			el.appendChild(document.createTextNode(child));
		} else {
			el.appendChild(child);
		}
	});
	return el;
}
