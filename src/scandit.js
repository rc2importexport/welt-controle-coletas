import { configure, DataCaptureContext, DataCaptureView, Camera, FrameSourceState } from '@scandit/web-datacapture-core';
import { barcodeCaptureLoader, BarcodeCapture, BarcodeCaptureSettings, BarcodeCaptureOverlay, Symbology } from '@scandit/web-datacapture-barcode';
let configurado = false;
export async function iniciarLeitor(elemento, licenca, aoLer) {
  if (!configurado) {
    await configure({
      licenseKey: licenca,
      libraryLocation: 'https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-core@7.6.0/sdc-lib/',
      moduleLoaders: [barcodeCaptureLoader()]
    });
    configurado = true;
  }
  let contexto;
  let camera;
  let captura;
  try {
    contexto = await DataCaptureContext.forLicenseKey(licenca);
    const view = await DataCaptureView.forContext(contexto);
    view.connectToElement(elemento);
    const settings = new BarcodeCaptureSettings();
    settings.enableSymbologies([Symbology.Code128]);
    captura = await BarcodeCapture.forContext(contexto, settings);
    await BarcodeCaptureOverlay.withBarcodeCaptureForView(captura, view);
    camera = Camera.default;
    if (!camera) throw new Error('Câmera não encontrada');
    await camera.applySettings(BarcodeCapture.recommendedCameraSettings);
    await contexto.setFrameSource(camera);
    captura.addListener({didScan: async (_capture, session) => {
      const codigo = session.newlyRecognizedBarcodes?.[0]?.data;
      if (codigo) await aoLer(codigo);
    }});
    await camera.switchToDesiredState(FrameSourceState.On);
    return {parar: async () => {
      try {await captura.setEnabled(false)} catch (_) {}
      try {await camera.switchToDesiredState(FrameSourceState.Off)} catch (_) {}
      await contexto.dispose();
    }};
  } catch (erro) {
    try {await camera?.switchToDesiredState(FrameSourceState.Off)} catch (_) {}
    try {await contexto?.dispose()} catch (_) {}
    throw erro;
  }
}
