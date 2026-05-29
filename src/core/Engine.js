/**
 * NEURAL_ARCHITECT_PREMIUM++ Core Engine
 * Main entry point for the 3D visual engine
 * 
 * @version 1.0.0
 * @author Neural Architect Team
 */

class NeuralArchitectEngine {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || null,
      autoUpdate: config.autoUpdate !== false,
      resourceOptimization: config.resourceOptimization !== false,
      targetFPS: config.targetFPS || 60,
      maxMemoryMB: config.maxMemoryMB || 45,
      enableProfiler: config.enableProfiler !== false,
      modules: config.modules || {}
    };

    this.modules = new Map();
    this.eventBus = null;
    this.isInitialized = false;
    this.version = '1.0.0';
  }

  /**
   * Initialize the engine and all modules
   */
  async init() {
    if (this.isInitialized) {
      console.warn('[NeuralArchitect] Engine already initialized');
      return this;
    }

    console.log('[NeuralArchitect] Initializing engine v' + this.version);

    // Initialize Event Bus first (other modules depend on it)
    this.eventBus = new EventBus();
    this.modules.set('eventBus', this.eventBus);

    // Initialize core modules
    await this._initModules();


    // Setup auto-update if enabled
    if (this.config.autoUpdate) {
      this._setupAutoUpdate();
    }

    this.isInitialized = true;
    this.eventBus.emit('engine:initialized', { version: this.version });
    
    return this;
  }

  /**
   * Initialize all core modules
   */
  async _initModules() {
    const moduleConfigs = [
      { name: 'apiGateway', class: APIGateway, config: { apiKey: this.config.apiKey } },
      { name: 'inputRouter', class: InputRouter, config: {} },
      { name: 'parallax', class: ParallaxCore, config: {} },
      { name: 'mathSolver', class: MathSolver, config: {} },
      { name: 'renderer', class: Renderer, config: {} },
      { name: 'profiler', class: Profiler, config: { enabled: this.config.enableProfiler } },
      { name: 'resources', class: ResourceManager, config: { 
        maxMemoryMB: this.config.maxMemoryMB,
        targetFPS: this.config.targetFPS
      }},
      { name: 'updater', class: UpdateManager, config: { autoUpdate: this.config.autoUpdate } }
    ];

    for (const { name, class: ModuleClass, config } of moduleConfigs) {
      try {
        const module = new ModuleClass(config, this.eventBus);
        this.modules.set(name, module);
        console.log(`[NeuralArchitect] Module loaded: ${name}`);
      } catch (error) {
        console.error(`[NeuralArchitect] Failed to load module ${name}:`, error);
      }
    }
  }

  /**
   * Setup auto-update from repository
   */
  _setupAutoUpdate() {
    const updater = this.modules.get('updater');
    if (updater) {
      updater.checkForUpdates();
      // Check for updates every 5 minutes
      setInterval(() => updater.checkForUpdates(), 5 * 60 * 1000);
    }
  }

  /**
   * Get a specific module by name
   * @param {string} name - Module name
   * @returns {Object|null} Module instance or null
   */
  getModule(name) {
    return this.modules.get(name) || null;
  }

  /**
   * Get engine status
   * @returns {Object} Engine status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      version: this.version,
      modules: Array.from(this.modules.keys()),
      config: { ...this.config, apiKey: this.config.apiKey ? '***' : null }
    };
  }

  /**
   * Destroy engine and clean up resources
   */
  destroy() {
    console.log('[NeuralArchitect] Destroying engine');
    
    for (const [name, module] of this.modules) {
      if (module.destroy) {
        module.destroy();
      }
    }
    
    this.modules.clear();
    this.isInitialized = false;
    this.eventBus.emit('engine:destroyed');
  }
}

/**
 * Event Bus for module communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

/**
 * API Gateway - handles API keys and authentication
 */
class APIGateway {
  constructor(config, eventBus) {
    this.apiKey = config.apiKey;
    this.eventBus = eventBus;
    this.connected = false;
  }

  async authenticate() {
    if (!this.apiKey) {
      console.warn('[APIGateway] No API key provided');
      return false;
    }
    
    // Simulate API key validation
    this.connected = true;
    this.eventBus.emit('api:authenticated', { success: true });
    return true;
  }

  destroy() {
    this.connected = false;
  }
}

/**
 * Input Router - handles mouse, keyboard, touch events
 */
class InputRouter {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.mousePosition = { x: 0, y: 0 };
    this.isActive = false;
  }

  init() {
    document.addEventListener('mousemove', this._handleMouseMove.bind(this));
    document.addEventListener('click', this._handleClick.bind(this));
    this.isActive = true;
  }

  _handleMouseMove(e) {
    this.mousePosition = { x: e.clientX, y: e.clientY };
    this.eventBus.emit('input:mousemove', this.mousePosition);
  }

  _handleClick(e) {
    this.eventBus.emit('input:click', { x: e.clientX, y: e.clientY });
  }

  destroy() {
    this.isActive = false;
  }
}

/**
 * Parallax Core - processes layer-by-layer parallax
 */
class ParallaxCore {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.layers = [];
    this.formula = 'ΔP = (I−C)⊗Dz⊗S⊗E(t)⊗Φ(ω)';
  }

  addLayer(layer) {
    this.layers.push(layer);
  }

  update(input, camera) {
    // Core parallax calculation
    for (const layer of this.layers) {
      const depth = layer.depth || 1;
      const offset = this._calculateOffset(input, depth);
      layer.position.x = offset.x;
      layer.position.y = offset.y;
    }
  }

  _calculateOffset(input, depth) {
    const factor = depth * 0.1;
    return {
      x: (input.x - window.innerWidth / 2) * factor,
      y: (input.y - window.innerHeight / 2) * factor
    };
  }

  destroy() {
    this.layers = [];
  }
}


/**
 * Math Solver - projection matrices and easing functions
 */
class MathSolver {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Cubic bezier easing
   */
  easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Calculate projection matrix
   */
  calculateProjection(width, height, fov = 55) {
    const aspect = width / height;
    const fovRad = fov * Math.PI / 180;
    return {
      fov: fovRad,
      aspect: aspect,
      near: 0.1,
      far: 1000
    };
  }

  destroy() {}
}

/**
 * Renderer - WebGL rendering optimizations
 */
class Renderer {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.drawCalls = 0;
    this.frameDrops = 0;
  }

  optimize() {
    // Frame rate dumping prevention
    // Draw call reduction
    this.drawCalls = Math.min(this.drawCalls, 15);
  }

  destroy() {}
}

/**
 * Profiler - performance monitoring
 */
class Profiler {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.enabled = config.enabled;
    this.fps = 60;
    this.frameTime = 0;
    this.frames = [];
  }

  start() {
    if (!this.enabled) return;
    this._trackFrame();
  }

  _trackFrame() {
    const now = performance.now();
    this.frames.push(now);
    
    // Keep only last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }
    
    // Calculate FPS
    if (this.frames.length > 1) {
      const elapsed = this.frames[this.frames.length - 1] - this.frames[0];
      this.fps = Math.round((this.frames.length - 1) / (elapsed / 1000));
    }
  }

  getReport() {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      targetFPS: 60
    };
  }

  stop() {}

  destroy() {
    this.frames = [];
  }
}

/**
 * Resource Manager - AI-based resource optimization
 */
class ResourceManager {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.maxMemoryMB = config.maxMemoryMB || 45;
    this.targetFPS = config.targetFPS || 60;
    this.currentMemory = 0;
  }

  optimize(complexity) {
    // AI-based request optimization
    // Adjust quality based on complexity
    const quality = this._calculateQuality(complexity);
    return { quality, complexity };
  }

  _calculateQuality(complexity) {
    // Simple quality calculation
    if (complexity > 0.8) return 'low';
    if (complexity > 0.5) return 'medium';
    return 'high';
  }

  getStats() {
    return {
      memory: this.currentMemory,
      maxMemory: this.maxMemoryMB,
      targetFPS: this.targetFPS
    };
  }

  setLimits(fps, memory) {
    this.targetFPS = fps;
    this.maxMemoryMB = memory;
  }

  destroy() {}
}


/**
 * Update Manager - auto-update from repository
 */
class UpdateManager {
  constructor(config, eventBus) {
    this.eventBus = eventBus;
    this.autoUpdate = config.autoUpdate;
    this.currentVersion = '1.0.0';
    this.repoUrl = 'https://api.github.com/repos/smol0901-jpg/neural-architect-engine';
  }

  async checkForUpdates() {
    if (!this.autoUpdate) return;
    
    try {
      const response = await fetch(this.repoUrl + '/releases/latest');
      const data = await response.json();
      
      if (data.tag_name && data.tag_name !== this.currentVersion) {
        this.eventBus.emit('update:available', { 
          version: data.tag_name,
          url: data.html_url
        });
      }
    } catch (error) {
      console.warn('[UpdateManager] Failed to check for updates:', error);
    }
  }

  destroy() {}
}

// Export for browser
if (typeof window !== 'undefined') {
  window.NeuralArchitectEngine = NeuralArchitectEngine;
}

export { NeuralArchitectEngine };