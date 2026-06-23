import {
  Component,
  ComponentClass,
  ComponentContext
} from './component';

export class Entity {
  private readonly components = new Map<ComponentClass<Component>, Component>();

  constructor(
    public x: number,
    public y: number
  ) {}

  /** Add a component. Components run in insertion order. */
  add(component: Component): this {
    this.components.set(
      component.constructor as ComponentClass<Component>,
      component
    );
    component.onAttach?.(this);
    return this;
  }

  /** Type-safe lookup: entity.get(Strikeable) -> Strikeable | undefined */
  get<T extends Component>(type: ComponentClass<T>): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  has(type: ComponentClass<Component>): boolean {
    return this.components.has(type);
  }

  update(ctx: ComponentContext): void {
    for (const c of this.components.values()) {
      c.update?.(ctx);
    }
  }

  dispose(): void {
    for (const c of this.components.values()) {
      c.dispose?.();
    }
  }
}
