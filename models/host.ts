export interface Node {
  name: string;
  customName: string;
  disks?: { name: string; devPath: string }[];
  witnessNode?: boolean;
}