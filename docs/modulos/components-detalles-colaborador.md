# Módulo: `Components/DetallesColaborador` — Ver detalle de colaborador

> Ver también: [Arquitectura general](../ARQUITECTURA.md) · [Índice de módulos](./README.md) · [Colaboradores](./components-colaboradores-permanentes.md)

## `ModalVerColaborador.tsx` (53 líneas)
Modal de **solo lectura** para ver los datos de un colaborador (Nombre, Correo, Tipo de vehículo, Placa). `Props` se importa de `Models/Modals.ts` (`{isOpen, onClose, collaborator}`).

- Componente puramente presentacional: retorna `null` si está cerrado o sin colaborador; renderiza cuatro campos.
- El archivo más simple y pequeño de todo el proyecto en cuanto a forma — un buen ejemplo de modal de solo lectura al que podrían parecerse otros modales del proyecto estructuralmente.

## Notas de calidad (deuda técnica)
- **Inalcanzable en producción**: el único botón que lo abriría, en [`Colaboradores.tsx`](./components-colaboradores-permanentes.md), está comentado — el estado y el propio `<ModalVerColaborador>` siguen montados, pero nunca se activan desde la UI.
- Mezcla clases de CSS Module (`styles.label`, `styles.value`) con una clase global suelta (`"pill"`, línea 34) y `style={{...}}` inline en el mismo render — tres enfoques de estilo distintos en 53 líneas.
- En el único punto donde se instancia (código comentado en `Colaboradores.tsx`), el prop `collaborator` se pasaría como `selected as any` — su tipado nunca llegó a validarse end-to-end en la práctica.
