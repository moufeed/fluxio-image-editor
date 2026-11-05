import { TestBed } from '@angular/core/testing';

import type { ImageEditorPlugin, ImageEditorPluginContext } from 'fluxio-image-editor/core';

import {
  clearRegisteredPlugins,
  collectHostPlugins,
  getRegisteredPluginRegistrations,
  IMAGE_EDITOR_PLUGINS,
  materializeImageEditorPlugin,
  provideImageEditorPlugins,
  registerPlugin,
} from '../../lib/plugins/host-plugin-registration';

class SamplePlugin implements ImageEditorPlugin {
  readonly id = 'sample';
  setup(_context: ImageEditorPluginContext): void {
    /* no-op */
  }
}

describe('host plugin registration', () => {
  afterEach(() => {
    clearRegisteredPlugins();
  });

  describe('materializeImageEditorPlugin', () => {
    it('returns instances as-is', () => {
      const plugin = new SamplePlugin();
      expect(materializeImageEditorPlugin(plugin)).toBe(plugin);
    });

    it('constructs class registrations', () => {
      const plugin = materializeImageEditorPlugin(SamplePlugin);
      expect(plugin).toBeInstanceOf(SamplePlugin);
      expect(plugin.id).toBe('sample');
    });

    it('invokes factory registrations', () => {
      const plugin = materializeImageEditorPlugin(() => new SamplePlugin());
      expect(plugin).toBeInstanceOf(SamplePlugin);
    });
  });

  describe('registerPlugin', () => {
    it('stores global registrations FilePond-style', () => {
      registerPlugin(SamplePlugin, () => new SamplePlugin());
      expect(getRegisteredPluginRegistrations()).toHaveLength(2);
    });

    it('clearRegisteredPlugins empties the global list', () => {
      registerPlugin(SamplePlugin);
      clearRegisteredPlugins();
      expect(getRegisteredPluginRegistrations()).toEqual([]);
    });
  });

  describe('collectHostPlugins', () => {
    it('merges DI → global → input in that order', () => {
      const fromDi: ImageEditorPlugin = {
        id: 'from-di',
        setup: () => undefined,
      };
      const fromGlobal: ImageEditorPlugin = {
        id: 'from-global',
        setup: () => undefined,
      };
      const fromInput: ImageEditorPlugin = {
        id: 'from-input',
        setup: () => undefined,
      };
      registerPlugin(fromGlobal);
      const merged = collectHostPlugins({
        provided: [[fromDi]],
        registered: getRegisteredPluginRegistrations(),
        input: [fromInput],
      });
      expect(merged.map((plugin) => plugin.id)).toEqual([
        'from-di',
        'from-global',
        'from-input',
      ]);
    });
  });

  describe('provideImageEditorPlugins', () => {
    it('registers a multi provider batch', () => {
      TestBed.configureTestingModule({
        providers: [provideImageEditorPlugins(SamplePlugin)],
      });
      const batches = TestBed.inject(IMAGE_EDITOR_PLUGINS);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);
      expect(materializeImageEditorPlugin(batches[0][0]).id).toBe('sample');
    });
  });
});
