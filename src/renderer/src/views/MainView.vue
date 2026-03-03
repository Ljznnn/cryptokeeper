<template>
  <div class="flex flex-col h-screen">
    <!-- 主界面 -->
    <div class="flex flex-col h-full">
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow px-4 py-3 flex justify-between items-center border-b ">
        <div>
          <h1 class="text-xl font-bold text-blue-600 select-none">CryptoKeeper</h1>
        </div>
        <div class="flex items-center space-x-2">
          <SpaceSelector
            @space-change="switchSpaceHandler"
            @create-space="showCreateSpaceDialog"
            :workspaces="workspaceStore.spaces"
            :currentSpaceId="workspaceStore.currentSpaceId"
          />
          <el-button @click="showDeleteWorkspaceDialog">
            <el-icon>
              <Delete />
            </el-icon>
            删除空间
          </el-button>
          <el-button @click="showSettings">
            <el-icon>
              <Setting />
            </el-icon>
            设置
          </el-button>
          <!--          <el-button @click="showRecycleBin">-->
          <!--            <el-icon><Delete /></el-icon>-->
          <!--            回收站-->
          <!--          </el-button>-->
        </div>
      </header>

      <!-- 主内容区 -->
      <div class="flex flex-1 overflow-hidden">
        <!-- 侧边栏 -->
        <aside class="w-64 bg-white border-r flex flex-col">
          <div class="p-4 border-b flex justify-between items-center">
            <h2 class="font-semibold select-none">密码本</h2>
            <el-button type="primary" circle size="small" @click="showCreateBookDialog">
              <el-icon>
                <Plus />
              </el-icon>
            </el-button>
          </div>
          <div class="flex-1 overflow-y-auto">
            <BookList
              :books="workspaceStore.passwordBooks"
              :currentBookId="workspaceStore.currentBook?.id || ''"
              @select-book="selectPasswordBook"
              @delete-book="showDeleteBookDialog"
              @edit-book="showEditBookDialog"
              @no-book="workspaceStore.passwords = []"
            />
          </div>
        </aside>

        <!-- 内容区域 -->
        <main class="flex-1 overflow-auto bg-gray-50">
          <div v-if="!workspaceStore.currentBook" class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
              <el-icon style="font-size: 48px">
                <Document />
              </el-icon>
              <p class="mt-2">请选择一个密码本</p>
            </div>
          </div>
          <div v-else class="p-4">
            <PasswordList
              :passwords="workspaceStore.passwords"
              :space-id="workspaceStore.currentSpaceId"
              :book-id="workspaceStore.currentBook?.id"
              @add-password="showAddPasswordDialog"
              @edit-password="showEditPasswordDialog"
              @del-password="showDeletePasswordDialog"
            />
          </div>
        </main>
      </div>
    </div>

    <!-- 创建空间对话框 -->
    <el-dialog v-model="createWorkspaceDialogVisible" title="创建空间" width="500">
      <el-form :model="newWorkspaceForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="newWorkspaceForm.name" placeholder="请输入空间名称" />
        </el-form-item>
        <!--        <el-form-item label="描述">-->
        <!--          <el-input-->
        <!--            v-model="newWorkspaceForm.desc"-->
        <!--            type="textarea"-->
        <!--            placeholder="请输入空间描述（可选）"-->
        <!--          />-->
        <!--        </el-form-item>-->
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createWorkspaceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreateWorkspace">创建</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除空间确认对话框 -->
    <el-dialog v-model="deleteWorkspaceDialogVisible" title="确认删除" width="500">
      <p>确定要删除空间 "{{ workspaceStore.currentSpace?.name }}" 吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteWorkspaceDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="handleDeleteWorkspace">确定删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 创建密码本对话框 -->
    <el-dialog v-model="createBookDialogVisible" title="创建密码本" width="500">
      <el-form :model="newBookForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="newBookForm.name" placeholder="请输入密码本名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newBookForm.desc"
            type="textarea"
            placeholder="请输入密码本描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createBookDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreateBook">创建</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="editBookDialogVisible" title="编辑密码本" width="500">
      <el-form :model="editBookForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editBookForm.name" placeholder="请输入密码本名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editBookForm.desc"
            type="textarea"
            placeholder="请输入密码本描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editBookDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleEditBook">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除密码本确认对话框 -->
    <el-dialog v-model="deleteBookDialogVisible" title="确认删除" width="500">
      <p>确定要删除密码本 "{{ deletingBook?.name }}" 吗？</p>
      <!--      <p class="text-gray-500 text-sm mt-2">注意：删除后密码本将移至回收站</p>-->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteBookDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="handleDeleteBook">确定删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加密码对话框 -->
    <el-dialog v-model="addPasswordDialogVisible" title="添加密码" width="500">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="passwordForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="passwordForm.password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="passwordForm.desc" type="textarea" placeholder="请输入描述（可选）" />
        </el-form-item>
        <el-form-item label="网址">
          <el-input v-model="passwordForm.url" placeholder="请输入网址（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPasswordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddPassword">添加</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑密码对话框 -->
    <el-dialog v-model="editPasswordDialogVisible" title="编辑密码" width="500">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="passwordForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="passwordForm.password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="passwordForm.desc" type="textarea" placeholder="请输入描述（可选）" />
        </el-form-item>
        <el-form-item label="网址">
          <el-input v-model="passwordForm.url" placeholder="请输入网址（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editPasswordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleEditPassword">确认</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 删除密码确认对话框 -->
    <el-dialog v-model="deletePasswordDialogVisible" title="确认删除" width="500">
      <p>确定要删除密码 "{{ deletingPassword?.username }}" 吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deletePasswordDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="handleDeletePassword">确定删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import SpaceSelector from '../components/layout/SpaceSelector.vue'
import BookList from '../components/password/BookList.vue'
import PasswordList from '../components/password/PasswordList.vue'
import { Plus, Document, Setting, Delete } from '@element-plus/icons-vue'
import { useWorkspaceStore } from '../store/workspaceStore'
import * as Types from '../models/types'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const createWorkspaceDialogVisible = ref(false)
const deleteWorkspaceDialogVisible = ref(false)
const createBookDialogVisible = ref(false)
const editBookDialogVisible = ref(false)
const deleteBookDialogVisible = ref(false)
const addPasswordDialogVisible = ref(false)
const editPasswordDialogVisible = ref(false)
const deletePasswordDialogVisible = ref(false)
const deletingBook = ref<Types.PasswordBook | null>(null)
const deletingPassword = ref<Types.Password | null>(null)

const newWorkspaceForm = reactive({
  name: '',
  desc: ''
})

const newBookForm = reactive({
  name: '',
  desc: ''
})

const editBookForm = reactive({
  id: '',
  name: '',
  desc: ''
})

const passwordForm = reactive({
  id: '',
  username: '',
  password: '',
  url: '',
  desc: ''
})

onBeforeMount(async () => {
  await workspaceStore.initWorkspace()
})

// 显示删除空间对话框
const showDeleteWorkspaceDialog = () => {
  if (!workspaceStore.currentSpace) {
    ElMessage.warning('请先选择一个空间')
    return
  }
  deleteWorkspaceDialogVisible.value = true
}

// 显示设置对话框
const showSettings = () => {
  router.push('/settings')
}

// 切换空间
const switchSpaceHandler = (spaceId: string) => {
  workspaceStore.switchSpace(spaceId)
}

// 选择密码本
const selectPasswordBook = (book: Types.PasswordBook) => {
  workspaceStore.currentBook = book
  workspaceStore.switchPasswordBook(book.id)
}

// 显示创建空间对话框
const showCreateSpaceDialog = () => {
  newWorkspaceForm.name = ''
  newWorkspaceForm.desc = ''
  createWorkspaceDialogVisible.value = true
}

// 创建空间
const handleCreateWorkspace = async () => {
  if (!newWorkspaceForm.name.trim()) {
    ElMessage.warning('请输入空间名称')
    return
  }

  if (workspaceStore.spaces.some((t) => t.name == newWorkspaceForm.name)) {
    ElMessage.warning('空间已存在')
    return
  }

  try {
    const newSpace: Types.Space = await workspaceStore.createSpace(
      newWorkspaceForm.name,
      newWorkspaceForm.desc
    )
    ElMessage.success('空间创建成功')
    workspaceStore.switchSpace(newSpace.id)
    createWorkspaceDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '创建空间失败')
  }
}

// 处理删除空间
const handleDeleteWorkspace = async () => {
  if (!workspaceStore.currentSpace) {
    ElMessage.warning('请先选择一个空间')
    return
  }
  try {
    await workspaceStore.deleteSpace(workspaceStore.currentSpaceId)
  } catch (error: any) {
    ElMessage.error(error.message || '删除空间失败')
  }
  // 默认选中第一个空间
  deleteWorkspaceDialogVisible.value = false
}

// 显示创建密码本对话框
const showCreateBookDialog = () => {
  if (!workspaceStore.currentSpace) {
    ElMessage.warning('请先选择一个空间')
    return
  }
  newBookForm.name = ''
  newBookForm.desc = ''
  createBookDialogVisible.value = true
}

// 处理创建密码本
const handleCreateBook = async () => {
  if (!newBookForm.name.trim()) {
    ElMessage.warning('请输入密码本名称')
    return
  }

  if (!workspaceStore.currentSpace) {
    ElMessage.error('请先选择一个空间')
    return
  }

  if (workspaceStore.passwordBooks.some((t) => t.name == newBookForm.name)) {
    ElMessage.warning('密码本已存在')
    return
  }

  try {
    await workspaceStore.createPasswordBook(
      newBookForm.name,
      workspaceStore.currentSpace.id,
      newBookForm.desc
    )
    ElMessage.success('密码本创建成功')
    createBookDialogVisible.value = false
  } catch (error: any) {
    console.error('创建密码本失败:', error)
    ElMessage.error(error.message || '创建密码本失败')
  }
}

// 显示删除密码本确认对话框
const showDeleteBookDialog = (book: Types.PasswordBook) => {
  deletingBook.value = book
  deleteBookDialogVisible.value = true
}

// 显示编辑密码本对话框
const showEditBookDialog = (book: Types.PasswordBook) => {
  editBookForm.id = book.id
  editBookForm.name = book.name
  editBookForm.desc = book.desc
  editBookDialogVisible.value = true
}

// 处理编辑密码本
const handleEditBook = async () => {
  if (!editBookForm.name.trim()) {
    ElMessage.warning('请输入密码本名称')
    return
  }

  if (
    workspaceStore.passwordBooks.some((t) => t.name == editBookForm.name && t.id != editBookForm.id)
  ) {
    ElMessage.warning('密码本已存在')
    return
  }

  try {
    await workspaceStore.updatePasswordBook(editBookForm.id, editBookForm.name, editBookForm.desc)
    ElMessage.success('密码本更新成功')
    editBookDialogVisible.value = false
  } catch (error: any) {
    console.error('更新密码本失败:', error)
    ElMessage.error(error.message || '更新密码本失败')
  }
}

// 处理删除密码本
const handleDeleteBook = async () => {
  if (!deletingBook.value || !workspaceStore.currentSpace) {
    ElMessage.error('缺少必要参数')
    return
  }

  try {
    await workspaceStore.deletePasswordBook(workspaceStore.currentSpace.id, deletingBook.value.id)
    ElMessage.success('密码本已删除')
    deleteBookDialogVisible.value = false

    // 如果删除的是当前选中的密码本，清空选中状态
    if (workspaceStore.currentBook?.id === deletingBook.value.id) {
      workspaceStore.currentBook = null
      workspaceStore.passwords = []
    }
  } catch (error: any) {
    console.error('删除密码本失败:', error)
    ElMessage.error(error.message || '删除密码本失败')
  }
}

// 显示添加密码对话框
const showAddPasswordDialog = () => {
  if (!workspaceStore.currentBook) {
    ElMessage.warning('请先选择密码本')
    return
  }
  // 清空表单
  passwordForm.username = ''
  passwordForm.password = ''
  passwordForm.url = ''
  passwordForm.desc = ''
  addPasswordDialogVisible.value = true
}

// 处理添加密码
const handleAddPassword = async () => {
  if (
    !workspaceStore.currentBook ||
    !workspaceStore.currentSpace ||
    !passwordForm.username.trim() ||
    !passwordForm.password.trim()
  ) {
    ElMessage.error('缺少必要参数')
    return
  }

  try {
    const passwordData = {
      username: passwordForm.username,
      password: passwordForm.password,
      url: passwordForm.url,
      desc: passwordForm.desc
    }

    await workspaceStore.createPassword(
      passwordData,
      workspaceStore.currentSpace.id,
      workspaceStore.currentBook.id
    )
    ElMessage.success('密码添加成功')
    addPasswordDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '添加密码失败')
  }
}
// 显示编辑密码对话框
const showEditPasswordDialog = async (passwordRow: Types.Password) => {
  passwordForm.id = passwordRow.id
  passwordForm.username = passwordRow.username
  passwordForm.password = await workspaceStore.decryptPassword(passwordRow.password, passwordRow.iv)
  passwordForm.url = passwordRow.url
  passwordForm.desc = passwordRow.desc
  editPasswordDialogVisible.value = true
}

//处理编辑密码
const handleEditPassword = async () => {
  if (!workspaceStore.currentBook || !workspaceStore.currentSpace) {
    ElMessage.error('缺少必要参数')
    return
  }
  try {
    const passwordData = {
      id: passwordForm.id,
      username: passwordForm.username,
      password: passwordForm.password,
      url: passwordForm.url,
      desc: passwordForm.desc
    }
    await workspaceStore.updatePassword(
      workspaceStore.currentSpace.id,
      workspaceStore.currentBook.id,
      passwordData
    )
    editPasswordDialogVisible.value = false
    ElMessage.success('编辑密码成功')
  } catch (error: any) {
    ElMessage.error(error.message || '编辑密码失败')
  }
}

// 显示删除密码对话框
const showDeletePasswordDialog = (password: Types.Password) => {
  deletingPassword.value = password
  deletePasswordDialogVisible.value = true
}

//处理删除密码
const handleDeletePassword = async () => {
  if (!deletingPassword.value || !workspaceStore.currentSpace || !workspaceStore.currentBook) {
    ElMessage.error('缺少必要参数')
    return
  }

  try {
    await workspaceStore.deletePassword(
      workspaceStore.currentSpace.id,
      workspaceStore.currentBook.id,
      deletingPassword.value?.id
    )
    ElMessage.success('密码已删除')
    deletePasswordDialogVisible.value = false
  } catch (error: any) {
    console.error('删除密码失败:', error)
    ElMessage.error(error.message || '删除密码失败')
  }
}
</script>
