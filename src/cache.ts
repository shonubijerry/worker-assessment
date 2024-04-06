export class KVStore {
  constructor(private readonly namespace: KVNamespace) {}

  async put<T>(key: string, value: T): Promise<void> {
    try {
      await this.namespace.put(key, JSON.stringify(value));
    } catch (error: any) {
      throw new Error(`Error putting key-value pair: ${error.message}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.namespace.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error: any) {
      throw new Error(`Error getting key-value pair: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.namespace.delete(key);
    } catch (error: any) {
      throw new Error(`Error deleting key-value pair: ${error.message}`);
    }
  }

  async update<T>(key: string, newValue: any): Promise<void> {
    try {
      const oldValue = await this.get(key);
      if (oldValue === null) {
        throw new Error(`Key '${key}' does not exist for update`);
      }
      await this.put(key, newValue);
    } catch (error: any) {
      throw new Error(`Error updating key-value pair: ${error.message}`);
    }
  }
}
