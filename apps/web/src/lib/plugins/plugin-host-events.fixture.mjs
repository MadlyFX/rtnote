export default {
  activate(context) {
    const disposeSettings = context.events.on("settings.changed", ({ key }) => {
      globalThis.rtnotePluginObservedSettings ??= [];
      globalThis.rtnotePluginObservedSettings.push({ pluginId: context.pluginId, key });
    });
    const disposeNote = context.events.on("note.updated", ({ note }) => {
      globalThis.rtnotePluginObservedNote = note;
    });
    const disposeTemplate = context.events.on("template.created", ({ template }) => {
      globalThis.rtnotePluginObservedTemplate = template;
    });
    const disposeResource = context.events.on("resource.updated", ({ resource }) => {
      globalThis.rtnotePluginObservedResource = resource;
    });
    return () => {
      disposeSettings();
      disposeNote();
      disposeTemplate();
      disposeResource();
    };
  },
};
