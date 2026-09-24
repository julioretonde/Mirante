/** Libera geometrias, materiais e texturas de uma árvore de objetos (evita vazamento de memória no celular). */
export function disposeObject(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.();
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const mat of mats) {
      for (const value of Object.values(mat)) {
        if (value && value.isTexture) value.dispose();
      }
      if (mat.uniforms) {
        for (const u of Object.values(mat.uniforms)) {
          if (u?.value?.isTexture) u.value.dispose();
        }
      }
      mat.dispose();
    }
  });
  root.removeFromParent();
}
