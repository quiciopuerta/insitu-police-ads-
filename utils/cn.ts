type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const value = inputs[i];
    if (!value) continue;

    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(value.toString());
    } else if (Array.isArray(value)) {
      if (value.length) {
        const inner = cn(...value);
        if (inner) classes.push(inner);
      }
    } else if (typeof value === 'object') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key) && value[key]) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}
