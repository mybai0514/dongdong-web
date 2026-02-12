'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Search,
  Plus,
  Loader2,
  Pin,
  Flame,
  X,
  Image,
} from 'lucide-react';
import { formatRelativeTime, getNowInUTC8, toUTC8 } from '@/lib/time';
import { useUser } from '@/hooks';
import { Textarea } from '@/components/ui/textarea';
import { getForumPosts, createForumPost, uploadImage, deleteImage } from '@/lib/api';
import type { ForumCategory, ForumPost } from '@/types';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const categorySlug = params.slug as string;

  // 常量定义
  const MAX_IMAGES = 5; // 最多上传图片数量
  const itemsPerPage = 12;

  // 从 URL 查询参数获取状态
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';
  const sortBy = (searchParams.get('sort') || 'latest') as
    | 'latest'
    | 'views'
    | 'likes';

  // 本地状态
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  // 发帖对话框
  const [createPostDialog, setCreatePostDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // 本地选择的文件
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; filename: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 本地搜索输入框状态（用于防止每次输入都调用接口）
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);

  // 监听分类和查询参数变化，获取数据
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, currentPage, sortBy, searchQuery]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getForumPosts(categorySlug, {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
        search: searchQuery || undefined,
      });

      setPosts(data.posts || []);
      setCategory(data.category || null);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('获取帖子列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新 URL 查询参数的辅助函数
  const updateQueryParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // 重置到第一页（除非明确指定了 page）
    if (
      newParams.page === undefined &&
      !(newParams.search === undefined && newParams.sort === undefined)
    ) {
      params.set('page', '1');
    }

    router.push(`?${params.toString()}`);
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    updateQueryParams({ search: query, page: '1' });
  };

  // 处理排序
  const handleSortChange = (newSort: string) => {
    updateQueryParams({ sort: newSort, page: '1' });
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    updateQueryParams({ page: page.toString() });
  };

  const handleAddImage = async (file: File) => {
    if (!file) {
      toast.warning('请选择图片');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('文件过大，最大支持 5MB');
      return;
    }

    // 验证文件类型
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.warning('仅支持 JPEG、PNG、WebP、GIF 格式');
      return;
    }

    // 使用函数式更新，避免状态竞争
    setSelectedFiles(prev => {
      // 检查图片数量限制
      if (prev.length >= MAX_IMAGES) {
        return prev;
      }
      return [...prev, file];
    });
  };

  const handleRemoveImage = (index: number) => {
    // 从本地文件列表中移除
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!user) {
      router.push(`/login?redirect=/forum/${categorySlug}`);
      return;
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.warning('标题和内容不能为空');
      return;
    }

    if (newPostTitle.length > 200) {
      toast.warning('标题不能超过200个字符');
      return;
    }

    if (newPostContent.length > 10000) {
      toast.warning('内容不能超过10000个字符');
      return;
    }

    setSubmitting(true);
    try {
      // 先上传所有图片
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = selectedFiles.map(file => uploadImage(file));
        const uploadResults = await Promise.all(uploadPromises);
        imageUrls = uploadResults.map(result => result.url);
        setIsUploading(false);
      }

      // 创建帖子
      await createForumPost(categorySlug, {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // 关闭对话框并重置表单
      setCreatePostDialog(false);
      setNewPostTitle('');
      setNewPostContent('');
      setSelectedFiles([]);
      setUploadedImages([]);

      // 重新加载帖子列表
      await fetchPosts();
      toast.success('发布成功！');
    } catch (error) {
      console.error('发布帖子失败:', error);
      const errorMessage =
        error instanceof Error ? error.message : '发布帖子失败';
      toast.error(errorMessage);

      // 如果是认证错误，跳转到登录页面
      if (errorMessage.includes('登录已过期') || errorMessage.includes('请先登录')) {
        setTimeout(() => {
          router.push(`/login?redirect=/forum/${categorySlug}`);
        }, 1500);
      }
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const getCategoryColor = (slug: string) => {
    if (slug === 'lusty') {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-700',
        button: 'bg-orange-500 hover:bg-orange-600',
      };
    } else if (slug === 'fishy') {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
        button: 'bg-blue-500 hover:bg-blue-600',
      };
    }
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-700',
      button: 'bg-gray-500 hover:bg-gray-600',
    };
  };

  const colors = category
    ? getCategoryColor(category.slug)
    : getCategoryColor('');

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 判断是否是新帖（24小时内）
  const isNewPost = (createdAt: string | null) => {
    if (!createdAt) return false;
    const postTime = toUTC8(createdAt).getTime();
    const now = getNowInUTC8().getTime();
    const hoursDiff = (now - postTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // 判断是否是热帖（浏览数 > 50 或评论数 > 5 或点赞数 > 10）
  const isHotPost = (post: ForumPost) => {
    return (
      post.views_count > 10 || post.comments_count > 5 || post.likes_count > 10
    );
  };

  if (loading && !category) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">分类不存在</h3>
          <Link href="/forum">
            <Button>返回论坛首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 分类标题 */}
      <div
        className={`${colors.bg} ${colors.border} border-2 rounded-lg p-6 mb-6`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-5xl ${colors.text}`}>
              {category.icon || '💬'}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
              <p className="text-muted-foreground">
                {category.description || '暂无描述'}
              </p>
              <Badge variant="secondary" className={`${colors.badge} mt-2`}>
                {category.post_count} 个帖子
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => {
              if (!user) {
                router.push(`/login?redirect=/forum/${categorySlug}`);
                return;
              }
              setCreatePostDialog(true);
            }}
            className={colors.button}
          >
            <Plus className="h-4 w-4 mr-2" />
            发布帖子
          </Button>
        </div>
      </div>

      {/* 搜索和排序 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索帖子标题或内容..."
            value={localSearchInput}
            onChange={(e) => setLocalSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(localSearchInput);
              }
            }}
            onBlur={() => {
              if (localSearchInput !== searchQuery) {
                handleSearch(localSearchInput);
              }
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(value) => handleSortChange(value)}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新发布</SelectItem>
            <SelectItem value="views">浏览最多</SelectItem>
            <SelectItem value="likes">点赞最多</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 帖子列表 - 卡片网格布局 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-100">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">暂无帖子</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? '没有找到匹配的帖子' : '成为第一个发帖的人吧！'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                if (!user) {
                  router.push(`/login?redirect=/forum/${categorySlug}`);
                  return;
                }
                setCreatePostDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              发布帖子
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/forum/${categorySlug}/${post.id}`}>
                <div className="border rounded-md bg-card hover:shadow-sm hover:border-primary/20 transition-all duration-200 cursor-pointer py-3 px-4 mb-2">
                  <div className="flex items-start gap-3">
                    {/* 作者头像 */}
                    <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {post.author_username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* 主要内容区域 */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* 标题行 */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {post.is_pinned && (
                            <Pin className="h-4 w-4 text-orange-500 shrink-0" />
                          )}
                          <h3 className="font-semibold text-base truncate">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isNewPost(post.created_at) && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1 py-0 h-4 shrink-0 font-medium"
                              >
                                NEW
                              </Badge>
                            )}
                            {isHotPost(post) && (
                              <Flame className="h-4 w-4 text-orange-500 shrink-0 fill-orange-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 内容预览和图片指示 */}
                      <div className="flex items-start gap-2 mb-2">
                        <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                          {truncateText(post.content, 100)}
                        </p>
                        {post.images && (() => {
                          try {
                            const images = JSON.parse(post.images);
                            if (Array.isArray(images) && images.length > 0) {
                              return (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Image className="h-3.5 w-3.5" />
                                  <span>{images.length}</span>
                                </div>
                              );
                            }
                          } catch (e) {
                            // 解析失败，不显示
                          }
                          return null;
                        })()}
                      </div>

                      {/* 底部信息区域 */}
                      <div className="flex items-center justify-between gap-4 mt-auto">
                        {/* 左侧:作者和时间 */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          <span className="font-medium">
                            {post.author_username}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.created_at
                              ? formatRelativeTime(post.created_at)
                              : '-'}
                          </span>
                        </div>

                        {/* 右侧:统计数据 - 横向排列 */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-medium text-foreground">
                              {post.views_count}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                            <span className="font-medium text-foreground">
                              {post.comments_count}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <ThumbsUp className="h-3.5 w-3.5 text-red-500" />
                            <span className="font-medium text-foreground">
                              {post.likes_count}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <ThumbsDown className="h-3.5 w-3.5 text-gray-500" />
                            <span className="font-medium text-foreground">
                              {post.dislikes_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    className={
                      currentPage === 1
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* 发帖对话框 */}
      <Dialog
        open={createPostDialog}
        onOpenChange={(open) => {
          setCreatePostDialog(open);
          if (!open) {
            // 关闭时重置表单
            setNewPostTitle('');
            setNewPostContent('');
            setSelectedFiles([]);
            setUploadedImages([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>发布新帖子</DialogTitle>
            <DialogDescription>
              在 {category.name} 分享你的想法
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">标题</label>
              <Input
                placeholder="输入帖子标题（最多200字符）"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newPostTitle.length}/200
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">内容</label>
              <Textarea
                placeholder="输入帖子内容（最多10000字符）"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={12}
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newPostContent.length}/10000
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                图片（可选，最多{MAX_IMAGES}张）
              </label>
              <div className="flex gap-2 mb-3">
                <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
                  selectedFiles.length >= MAX_IMAGES
                    ? 'border-muted-foreground/30 bg-muted/50 cursor-not-allowed'
                    : 'border-muted-foreground cursor-pointer hover:border-primary hover:bg-muted'
                }`}>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        const remainingSlots = MAX_IMAGES - selectedFiles.length;

                        if (files.length > remainingSlots) {
                          toast.warning(`最多只能上传${remainingSlots}张图片`);
                          files.slice(0, remainingSlots).forEach((file) => {
                            handleAddImage(file);
                          });
                        } else {
                          files.forEach((file) => {
                            handleAddImage(file);
                          });
                        }
                        e.target.value = '';
                      }
                    }}
                    disabled={isUploading || selectedFiles.length >= MAX_IMAGES}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>上传中...</span>
                      </>
                    ) : selectedFiles.length >= MAX_IMAGES ? (
                      <>
                        <Image className="h-4 w-4" />
                        <span>已达到上传上限</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>点击选择图片（{selectedFiles.length}/{MAX_IMAGES}）</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      已选择图片 ({selectedFiles.length}/{MAX_IMAGES})
                    </p>
                  </div>
                  <div className="grid grid-cols-5 gap-2 h-22">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border border-muted-foreground/20 bg-muted"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatePostDialog(false)}
              disabled={submitting}
            >
              关闭
            </Button>
            <Button onClick={handleCreatePost} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                '发布'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
