/**
 * Local implementation of Pyth ByteBuffer for Starknet to bypass broken @pythnetwork/pyth-starknet-js package.
 * Converts a base64 VAA from Hermes into a calldata array of felt252s.
 */
export class ByteBuffer {
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  static fromBase64(base64: string): ByteBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new ByteBuffer(bytes);
  }

  /**
   * Encodes the byte buffer into a list of felts for Starknet.
   * Each felt stores a chunk of the buffer (up to 31 bytes).
   */
  toCalldata(): string[] {
    const felts: string[] = [];
    const chunkSize = 31; // Max bytes per felt to be safe in Starknet

    for (let i = 0; i < this.data.length; i += chunkSize) {
      const chunk = this.data.slice(i, i + chunkSize);
      let hex = '0x';
      chunk.forEach((byte) => {
        hex += byte.toString(16).padStart(2, '0');
      });
      felts.push(BigInt(hex).toString());
    }

    // Return [length, ...felts] as per Starknet's Array<felt252> serialization
    return [felts.length.toString(), ...felts];
  }
}
