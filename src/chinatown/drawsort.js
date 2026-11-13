// The order opaque meshes are drawn in, on phones.
//
// three.js draws opaque meshes front to back. That lets a desktop GPU skip hidden pixels, but
// it switches shader program and material from one draw to the next: about 320 program
// switches a frame on the street, each one sending the lights, the camera and the material's
// uniforms again. In Safari every WebGL call also crosses to the GPU process, so on an iPhone
// the frame is held up by the number of calls rather than by pixels. Apple GPUs hide covered
// pixels themselves (and so, mostly, do the tile renderers on Android phones), so on handheld
// devices the meshes are grouped by program and then by material instead: about 85 switches,
// and some 5 to 10 ms less main-thread time a frame on an iPhone Air.
//
// game.js sets this with renderer.setOpaqueSort on handheld devices. Transparent meshes keep
// three.js's back-to-front order.

export function programSort(renderer) {
  const program = (material) => {
    const p = renderer.properties.get(material);
    return (p && p.currentProgram && p.currentProgram.id) || 0;
  };
  return (a, b) =>
    a.groupOrder - b.groupOrder ||
    a.renderOrder - b.renderOrder ||
    program(a.material) - program(b.material) ||
    a.material.id - b.material.id ||
    a.z - b.z ||
    a.id - b.id;
}
