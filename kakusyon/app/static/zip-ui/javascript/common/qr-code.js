
import { QRCore, QRCanvas } from "../vendor/qr-code-engine.js";








export default {

  async toDataURL(text, options) {

    return QRCanvas.renderToDataURL(QRCore.create(text, options), options);

  },

};
