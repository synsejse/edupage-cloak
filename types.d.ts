interface Window {
  jQuery?: any;
  $: any;
}

interface JQueryStatic {
  Deferred(): any;
}

interface JQuery {
  etestPlayer: {
    (options?: any): JQuery;
    defaults: any;
  };
}

interface Document {
  webkitVisibilityState: string;
  mozFullScreenElement: any;
  webkitFullscreenElement: any;
}
