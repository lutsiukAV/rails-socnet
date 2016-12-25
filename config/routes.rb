Rails.application.routes.draw do
  get 'sessions/new'
  get 'users/json' => 'users#list_json'
  root 'static_pages#home'
  get 'signup' => 'users#new'
  get 'creategroup' => 'groups#new'
  get 'login' => 'sessions#new'
  post 'login' => 'sessions#create'
  delete 'logout'                 => 'sessions#destroy'
  get 'friends/add/:id'          => 'friends#add'
  post 'friends/remove/:id'       => 'friends#remove'
  get 'users/friends/add/:id'    => 'friends#add'
  post 'users/friends/remove/:id' => 'friends#remove'
  get 'friends' => 'friends#index'
  get 'groups/:id' => 'groups#show'
  delete 'groups/remove/:id' => 'groups#destroy'
  post 'users/destroy/:id' => 'users#destroy'
  get 'groups/changestatus/:id' => 'groups#changestatus'
  get 'microposts/destroy/:id' => 'microposts#destroy'
  post 'microposts/post' => 'microposts#post'
  delete 'groups/microposts/destroy/:id' => 'microposts#destroy'
  get 'groups/microposts/edit/:id' => 'microposts#edit'
  get 'microposts/edit/:id' => 'microposts#edit'
  get 'msg/list' => 'text_chat#list', as: :messages
  get 'users/msg/new/:id' => 'text_chat#new', as: :compose
  post 'msg/send' => 'text_chat#send_msg'
  get 'users/video/:id' => 'video_chat#start'
  get 'msg/dialog/:id' => 'text_chat#dialog', as: :dialog
  match 'users/video/auth' => 'video_chat#auth', via: [:get, :post], as: :video
  resources :users
  resources :friends
  resources :groups
  resources :microposts, only: [:create]
end
