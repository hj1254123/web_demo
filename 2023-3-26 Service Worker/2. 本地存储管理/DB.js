class DB {
  constructor({
    dbName = 'db',
    version = 1,
    storeName
  }) {
    this.dbName = dbName
    this.storeName = storeName
    this.version = version
  }

  async getDB() {
    // 优先返回缓存的数据库实例
    if(this.db) {
      return this.db
    }
    // 打开数据库
    let request = indexedDB.open(this.dbName, this.version)
    // 当数据库初始化或升级时创建仓库
    request.onupgradeneeded = event => {
      let db = event.target.result
      // 当仓库不存在时创建仓库，同时规定 key 为索引
      if(!db.objectStoreNames.contains(this.storeName)) {
        db.createObjectStore(this.storeName, { keyPath: 'key' })
      }
    }

    let event = await promisify(request)
    this.db = event.target.result
    return this.db
  }

  async setItem(key, value) {
    // 获取数据库
    let db = await this.getDB()
    // 创建事务，指定使用到的仓库名以及读写权限
    let transaction = db.transaction([this.storeName], 'readwrite')
    // 获取仓库实例
    let objectStore = transaction.objectStore(this.storeName)
    // 将 key 和 value 包装成对象 {key, value} 并存入仓库
    let request = objectStore.put({ key, value })
    // 异步执行结果通过 Promise 返回
    return promisify(request)
  }

  async getItem(key) {
    // 获取数据库实例
    let db = await this.getDB()
    // 创建事务，并指定好仓库名以及操作的只读权限
    let transaction = db.transaction([this.storeName], 'readonly')
    // 获取仓库实例
    let objectStore = transaction.objectStore(this.storeName)
    // 查找对应的数据并通过 Promise 对象包装后返回
    let request = objectStore.get(key)
    let event = await promisify(request)
    return event.target.result && event.target.result.value
  }

  async getAll() {
    // 获取数据库实例
    let db = await this.getDB()
    // 创建事务，并指定好仓库名以及操作的只读权限
    let transaction = db.transaction([this.storeName], 'readonly')
    // 获取仓库实例
    let objectStore = transaction.objectStore(this.storeName)
    // 读取仓库全部数据
    let request = objectStore.getAll()
    let event = await promisify(request)
    let result = event.target.result
    // 当数据为空时，返回空
    if(!result || !result.length) {
      return
    }
    // 数据不为空时，将数据包装成 Map 对象并返回
    let map = new Map()
    for(let { key, value } of result) {
      map.set(key, value)
    }
    return map
  }

  async removeItem(key) {
    // 获取数据库实例
    let db = await this.getDB()
    // 创建事务，并指定好仓库名以及删除操作的读写权限
    let transaction = db.transaction([this.storeName], 'readwrite')
    let objectStore = transaction.objectStore(this.storeName)
    // 删除数据，并用 Promise 进行包裹
    let request = objectStore.delete(key)
    return promisify(request)
  }
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = resolve
    request.onerror = reject
  })
}