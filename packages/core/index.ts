
import { UpploadService } from "../service";
import { UpploadUploader } from "../uploader";
import "./index.scss";

export interface HandlersParams {
  upload: (file: Blob) => Promise<string>;
  handle: (error: any) => void;
}

class DefaultService extends UpploadService {
  name = "default";
  template = () => `<p>Select a service from the left.</p>`;
};
class UploadingService extends UpploadService {
  name = "uploading";
  invisible = true;
  template = () => `<p>Uploading your file...</p>`;
}
class FakeUploader extends UpploadUploader {
  name = "fake-uploader";
  upload = (file: Blob): Promise<string> => {
    console.log("Debug: Using fake uploader");
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("Fake URL");
      }, 1500);
    });
  }
}

export default class Uppload {
  services: UpploadService[] = [new DefaultService(), new UploadingService()];
  uploaders: UpploadUploader[] = [new FakeUploader()];
  isOpen = false;
  activeService = "default";
  container: HTMLDivElement;

  constructor() {
    const div = document.createElement("div");
    const body = document.body;
    if (body) {
      body.appendChild(div);
    }
    this.container = div;
  }

  ready() {
  }

  use(plugin: UpploadUploader | UpploadService | UpploadUploader[] | UpploadService[]) {
    if (Array.isArray(plugin)) {
      plugin.forEach((item: UpploadUploader | UpploadService) => this.install(item));
    } else {
      this.install(plugin);
    }
  }
  install(plugin: UpploadUploader | UpploadService) {
    if (plugin.type === "service") {
      // Install this service
      this.services.push(plugin as UpploadService);
      this.ready();
    } else if (plugin.type === "uploader") {
      this.uploaders.push(plugin as UpploadUploader);
      this.ready();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.update();
  }

  update() {
    this.container.innerHTML = this.render();
    window.requestAnimationFrame(() => this.handlers());
  }

  render() {
    return `
      <div class="uppload-modal">
        <aside>
          <ul>
            ${this.services.filter(service => !service.invisible).map(service =>
              `<li data-uppload-service="${service.name}" class="service-${this.activeService === service.name ? 'active' : 'inactive'}">
                <span>${service.name}</span>
              </li>`
            ).join("")}
          </ul>
        </aside>
        <section>
          ${this.renderActiveService()}
        </section>
      </div>
    `;
  }

  renderActiveService() {
    const activeServices = this.services.filter(service => service.name === this.activeService);
    if (activeServices.length) {
      const activeService = activeServices[0];
      requestAnimationFrame(() => {
        if (typeof activeService.handlers === "function") activeService.handlers({
          upload: this.upload.bind(this),
          handle: this.handle.bind(this)
        });
      });
      return `${typeof activeService.template === "function" ? activeService.template() : ""}`;
    }
  }

  async upload(file: Blob) {
    console.log("Uploading a file", file);
    this.navigate("uploading");
    if (this.uploaders.length) {
      const uploader = this.uploaders[0];
      if (typeof uploader.upload === "function") {
        const url = await uploader.upload(file);
        console.log("File uploaded successfully", url);
        this.navigate("default");
        return url;
      }
    }
    throw new Error("no-uploader");
  }
  handle(error: any) {
    console.log("Handling an error", error);
  }

  handlers() {
    const sidebarLinks = this.container.querySelectorAll("aside ul li");
    sidebarLinks.forEach(link => {
      link.addEventListener("click", e => {
        const service = link.getAttribute("data-uppload-service");
        if (service) this.navigate(service);
        e.preventDefault();
        return false;
      });
    });
  }

  navigate(service: string) {
    if (!this.services.filter(item => item.name === service).length)
      throw new Error("invalid-service");
    this.activeService = service;
    this.update();
  }
}
