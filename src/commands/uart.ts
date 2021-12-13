import { Arguments, CommandBuilder } from "yargs";
import noble from "@abandonware/noble";
import { createInterface } from "readline";

export const command = "uart";

export const desc = "UART terminal";

export type Options = {
  id: string;
};

function findCharacteristic(
  characteristics: noble.Characteristic[],
  uuid: string
): noble.Characteristic | undefined {
  return characteristics.find((c) => c.uuid === uuid);
}

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs.option({
    id: {
      alias: "i",
      describe: "Device ID",
      type: "string",
      demandOption: true,
    },
  });
};

let foundPeripheral: noble.Peripheral | undefined;

export const handler = async (argv: Arguments<Options>) => {
  const { id } = argv;

  console.log(`Connecting to ${id}...`);

  noble.on("stateChange", (state) => {
    if (state === "poweredOn") {
      noble.startScanning();
    } else {
      noble.stopScanning();
    }
  });

  noble.on("discover", async (peripheral) => {
    if (peripheral.id === id) {
      console.log("Found peripheral:", peripheral.id);
      foundPeripheral = peripheral;

      await peripheral.connectAsync();

      console.log("Connected to peripheral:", peripheral.id);

      const nordicUartServiceUuid = "6e400001b5a3f393e0a9e50e24dcca9e";
      const uartTxCharacteristicUuid = "6e400003b5a3f393e0a9e50e24dcca9e";
      const uartRxCharacteristicUuid = "6e400002b5a3f393e0a9e50e24dcca9e";

      const services = [nordicUartServiceUuid];
      const characteristics = [
        uartTxCharacteristicUuid,
        uartRxCharacteristicUuid,
      ];

      const serviceAndCharacteristics =
        await peripheral.discoverSomeServicesAndCharacteristicsAsync(
          services,
          characteristics
        );

      const txCharacteristic = findCharacteristic(
        serviceAndCharacteristics.characteristics,
        uartTxCharacteristicUuid
      );

      if (txCharacteristic) {
        console.log("Found TX characteristic:", txCharacteristic.uuid);
        txCharacteristic.on("data", (data) => {
          console.log(data.toString());
        });

        await txCharacteristic.subscribeAsync();
      }

      const rxCharacteristic = findCharacteristic(
        serviceAndCharacteristics.characteristics,
        uartRxCharacteristicUuid
      );

      if (rxCharacteristic) {
        const rl = createInterface({
          input: process.stdin,
        });

        rl.on("line", async (line) => {
          const cmd = line.trim() + "\r\n";
          const payload = Buffer.from(cmd, "utf8");
          await rxCharacteristic.writeAsync(payload, true);
        });
      }
    }
  });
};
