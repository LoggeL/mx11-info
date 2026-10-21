export function valueAt(values, index = -1) {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value[index < 0 ? value.length - 1 : Math.min(index, value.length - 1)] : value]));
}
export function motionStyle(values) {
    const { x = 0, y = 0, scale = 1, rotate = 0, ...css } = valueAt(values);
    const transforms = [
        Number(x) !== 0 ? `translateX(${x}px)` : "",
        Number(y) !== 0 ? `translateY(${y}px)` : "",
        Number(scale) !== 1 ? `scale(${scale})` : "",
        Number(rotate) !== 0 ? `rotate(${rotate}deg)` : "",
    ].filter(Boolean);
    return { ...css, transform: transforms.join(" ") || "none" };
}
export function easing(value) {
    if (Array.isArray(value))
        return `cubic-bezier(${value.join(",")})`;
    return { easeOut: "cubic-bezier(0,0,0.58,1)", easeInOut: "cubic-bezier(0.42,0,0.58,1)" }[value ?? ""] || value || "ease";
}
