import { Arguments, CommandBuilder } from "yargs";
import noble from "@abandonware/noble";

export const command = "lescan";

export const desc = "Scan for BLE devices";

type Options = {
  timeout: number;
};

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs.option("timeout", {
    alias: "t",
    describe: "Timeout in seconds",
    type: "number",
    default: 10,
  });
};

export const handler = async (argv: Arguments<Options>) => {
  const { timeout } = argv;

  noble.on("stateChange", (state) => {
    if (state === "poweredOn") {
      noble.startScanning();
    } else {
      noble.stopScanning();
    }
  });

  noble.on("discover", (peripheral) => {
    const id = peripheral.id;
    const address = peripheral.address || "<Not Available>";
    const name = peripheral.advertisement.localName || "<Not Available>";
    console.log(
      `Found device: ${id}\t${address}\t${name}\t${peripheral.rssi}`
    );
  });

  setTimeout(async () => {
    await noble.stopScanning();
    process.exit(0);
  }, timeout * 1000);
};
