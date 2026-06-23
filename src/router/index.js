import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'welcome', component: WelcomeView },
  { path: '/collections', name: 'home', component: HomeView },
  {
    path: '/collection/:id',
    name: 'collection',
    component: () => import('../views/CollectionView.vue')
  },
  {
    path: '/collection/:collectionId/image/:imageId',
    name: 'image-edit',
    component: () => import('../views/ImageView.vue')
  },
  {
    path: '/collection/:id/unowned',
    name: 'unowned',
    component: () => import('../views/UnownedView.vue')
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('../views/AlbumList.vue')
  },
  {
    path: '/album/:id',
    name: 'album',
    component: () => import('../views/AlbumDetail.vue')
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
