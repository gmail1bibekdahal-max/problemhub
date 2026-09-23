'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  List,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
  BarChart3,
  X,
  LogOut,
  Zap,
  ThumbsUp,
  MoreHorizontal,
  ChevronDown,
  Globe,
  Mail,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'

type CommentItem = {
  id: string
  userId?: string
  user: string
  initials?: string
  accent?: string
  text: string
  time: string
  likes?: number
  liked?: boolean
  isOp?: boolean
  parentId?: string | null
  replies?: CommentItem[]
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return 'recently'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diffMs)) return 'recently'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type SponsoredProduct = {
  name: string
  description: string
  className: string
  mark: string
  url?: string
  logoUrl?: string
}

const DEFAULT_PRODUCTS: SponsoredProduct[] = [
  {
    name: 'Sorget',
    description: 'A marketing attribution platform for B2B teams.',
    className: 'product-sorget',
    mark: 'S',
    url: 'https://sorget.site',
    logoUrl: '/sorget-logo.png',
  },
]

type Problem = {
  id: string
  userId?: string
  user: string
  initials: string
  time: string
  category: string
  categoryClass: string
  title: string
  paragraphs: string[]
  frequency: string
  timeWasted: string
  currentSolution: string
  impact: string
  impactDetail?: string
  lookingFor: string[]
  comments: number
  people: number
  accent: string
  saved?: boolean
  commentsList?: CommentItem[]
  problemVotes?: number
  solutionVotes?: number
  userVotedProblem?: boolean
  userVotedSolution?: boolean
}



const reflectionPrompts = [
  'What\'s frustrating you?',
  'What takes too long?',
  'What do you do manually?',
  'What has no good solution?',
  'What do you wish were easier?',
]


function Logo({ onRefresh }: { onRefresh?: () => void }) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    const feedEl = document.querySelector('.feed') as HTMLElement | null
    if (feedEl) {
      feedEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <a
      href="/"
      className="logo"
      onClick={handleClick}
      title="ProblemHub - Refresh and go to top"
      aria-label="ProblemHub Home"
    >
      <img
        src="/ProblemHub Full logo.png"
        alt="ProblemHub"
        className="logo-full-img"
        width={186}
        height={62}
      />
    </a>
  )
}

function Avatar({ problem }: { problem: Problem }) {
  return <div className={`avatar ${problem.accent}`}>{problem.initials}</div>
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="action-button" onClick={onClick}>
      {children}
    </button>
  )
}

function ProblemCard({
  problem,
  onToggleSave,
  onShare,
  onAddComment,
  onToggleLikeComment,
  onToggleReaction,
  onRequireAuth,
  user,
  isHighlighted,
}: {
  problem: Problem
  onToggleSave: (id: string) => void
  onShare: (problem: Problem) => void
  onAddComment: (id: string, text: string, parentId?: string | null) => void
  onToggleLikeComment: (problemId: string, commentId: string) => void
  onToggleReaction: (problemId: string, type: 'problem' | 'solution') => void
  onRequireAuth: (intent: 'comment' | 'reaction' | 'save') => void
  user: { id: string; email?: string | null } | null
  isHighlighted?: boolean
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top')
  const [replyingTo, setReplyingTo] = useState<{ id: string; user: string } | null>(null)


  const userHandle = (user?.email?.split('@')[0] || '').toLowerCase()
  const isMyPost = Boolean(user && (problem.userId === user.id || problem.user.toLowerCase() === userHandle))
  const isMyReply = Boolean(
    user &&
      problem.commentsList?.some(
        (c) =>
          c.userId === user.id ||
          c.user.toLowerCase() === userHandle ||
          c.replies?.some((r) => r.userId === user.id || r.user.toLowerCase() === userHandle)
      )
  )

  const totalCommentsCount = useMemo(() => {
    if (!problem.commentsList) return problem.comments || 0
    let count = 0
    for (const c of problem.commentsList) {
      count += 1
      if (c.replies) count += c.replies.length
    }
    return count
  }, [problem.commentsList, problem.comments])

  const sortedComments = useMemo(() => {
    if (!problem.commentsList) return []
    const list = [...problem.commentsList]
    if (commentSort === 'top') {
      return list.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    }
    return list
  }, [problem.commentsList, commentSort])

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentDraft.trim()) return
    onAddComment(problem.id, commentDraft.trim(), replyingTo ? replyingTo.id : null)
    setCommentDraft('')
    setReplyingTo(null)
  }

  function handleStartReply(parentId: string, username: string) {
    setReplyingTo({ id: parentId, user: username })
    setCommentDraft((prev) => (prev.startsWith(`@${username} `) ? prev : `@${username} `))
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = copyRef.current
    if (!el) return

    if (isExpanded) return

    const check = () => {
      if (!copyRef.current) return
      const isClamped = copyRef.current.scrollHeight > copyRef.current.clientHeight + 4
      setHasOverflow(isClamped)
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [problem.paragraphs, problem.title, isExpanded])

  return (
    <article
      className={`problem-card ${isHighlighted ? 'highlighted-post' : ''}`}
      id={`problem-${problem.id}`}
      data-post-id={problem.id}
    >
      <div className="problem-header">
        <div className="user-row">
          <Avatar problem={problem} />
          <div>
            <strong>{problem.user}</strong>
            <span>{problem.time}</span>
          </div>
        </div>
        <div className="header-actions">
          {isMyPost && <span className="user-badge my-post-badge">Your Post</span>}
          {!isMyPost && isMyReply && <span className="user-badge my-reply-badge">You Replied</span>}
          <span className={`category ${problem.categoryClass}`}>{problem.category}</span>
          <button
            className="more"
            aria-label="Share post options"
            type="button"
            onClick={() => onShare(problem)}
            title="Share this post"
          >
            •••
          </button>
        </div>
      </div>
      <h2
        onClick={() => {
          if (hasOverflow) setIsExpanded((prev) => !prev)
        }}
        style={{ cursor: hasOverflow ? 'pointer' : 'default' }}
        title={hasOverflow ? (isExpanded ? 'Click to show less' : 'Click to see full post') : undefined}
      >
        {problem.title}
      </h2>
      <div
        ref={copyRef}
        className={`problem-copy ${!isExpanded ? 'clamped' : 'expanded'} ${hasOverflow ? 'clickable' : ''}`}
        onClick={() => {
          if (hasOverflow) setIsExpanded((prev) => !prev)
        }}
        title={hasOverflow ? (isExpanded ? 'Click to show less' : 'Click to see full post') : undefined}
      >
        {problem.paragraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
      {hasOverflow && (
        <button
          type="button"
          className="see-more-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((prev) => !prev)
          }}
        >
          {isExpanded ? 'See less' : '... See more'}
        </button>
      )}

      {/* Structured Stats Vertical List */}
      {(problem.frequency || problem.timeWasted || problem.currentSolution || problem.impact) && (
        <div className="stats-vertical stats-grid">
          {problem.frequency && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <CalendarDays />
              </div>
              <div className="stat-body">
                <span className="stat-label">Frequency</span>
                <strong className="stat-value">{problem.frequency}</strong>
              </div>
            </div>
          )}
          {problem.timeWasted && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <Clock3 />
              </div>
              <div className="stat-body">
                <span className="stat-label">Time wasted</span>
                <strong className="stat-value">{problem.timeWasted}</strong>
              </div>
            </div>
          )}
          {problem.currentSolution && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <List />
              </div>
              <div className="stat-body">
                <span className="stat-label">Current solution</span>
                <strong className="stat-value">{problem.currentSolution}</strong>
              </div>
            </div>
          )}
          {problem.impact && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <BarChart3 />
              </div>
              <div className="stat-body">
                <span className="stat-label">Impact</span>
                <strong className="stat-value">
                  {problem.impact}
                  {problem.impactDetail ? <small>{problem.impactDetail}</small> : null}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Looking for tags matching screenshot */}
      {problem.lookingFor && problem.lookingFor.length > 0 && (
        <div className="looking">
          <span>Looking for:</span>
          {problem.lookingFor.map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      )}

      <div className="card-footer">
        <div className="footer-actions">
          <div className="footer-primary-reactions">
            <button
              type="button"
              className={`reaction-button reaction-problem ${problem.userVotedProblem ? 'active' : ''}`}
              onClick={() => {
                if (!user) {
                  onRequireAuth('reaction')
                  return
                }
                onToggleReaction(problem.id, 'problem')
              }}
              title={problem.userVotedProblem ? 'You flagged this problem (Click to undo)' : 'I have this problem too'}
              aria-label="I have this problem too"
              aria-pressed={problem.userVotedProblem}
            >
              <HelpCircle />
              <span>Problem</span>
              <span className="reaction-count">{problem.problemVotes ?? 0}</span>
            </button>

            <button
              type="button"
              className={`reaction-button reaction-solution ${problem.userVotedSolution ? 'active' : ''}`}
              onClick={() => {
                if (!user) {
                  onRequireAuth('reaction')
                  return
                }
                onToggleReaction(problem.id, 'solution')
              }}
              title={problem.userVotedSolution ? 'You offered a solution (Click to undo)' : 'I have / propose a solution'}
              aria-label="I have or build a solution"
              aria-pressed={problem.userVotedSolution}
            >
              <Lightbulb />
              <span>Solution</span>
              <span className="reaction-count">{problem.solutionVotes ?? 0}</span>
            </button>
          </div>

          <div className="footer-secondary-actions">
            <ActionButton onClick={() => setShowComments((prev) => !prev)}>
              <MessageCircle /> <span>{totalCommentsCount} {totalCommentsCount === 1 ? 'comment' : 'comments'}</span>
            </ActionButton>
            <ActionButton onClick={() => {
              if (!user) {
                onRequireAuth('save')
                return
              }
              onToggleSave(problem.id)
            }}>
              <Bookmark fill={problem.saved ? 'currentColor' : 'none'} /> <span>{problem.saved ? 'Saved' : 'Save'}</span>
            </ActionButton>
            <ActionButton onClick={() => onShare(problem)}>
              <Share2 /> <span>Share</span>
            </ActionButton>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="linkedin-comments-panel">
          {/* 1. LinkedIn Top Compose Box */}
          {!user ? (
            <div
              className="comments-auth-prompt"
              onClick={() => onRequireAuth('comment')}
              role="button"
              tabIndex={0}
              title="Sign in to comment or reply"
            >
              <div className="comments-auth-icon">
                <MessageCircle />
              </div>
              <div className="comments-auth-text">
                <span>Sign in with <strong>Google</strong> or <strong>Email</strong> to join the discussion and post a comment</span>
              </div>
              <button
                type="button"
                className="comments-auth-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onRequireAuth('comment')
                }}
              >
                Sign In
              </button>
            </div>
          ) : (
            <form className="linkedin-compose-box" onSubmit={handleCommentSubmit}>
              {replyingTo && (
                <div className="linkedin-replying-badge">
                  <span>Replying to <strong>@{replyingTo.user}</strong></span>
                  <button
                    type="button"
                    className="replying-cancel-btn"
                    onClick={() => setReplyingTo(null)}
                    title="Cancel reply"
                  >
                    <X />
                  </button>
                </div>
              )}
              <div className="linkedin-input-row">
                <div className="linkedin-compose-avatar">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="linkedin-input-pill">
                  <input
                    type="text"
                    placeholder={replyingTo ? `Add a reply to @${replyingTo.user}...` : "Add a comment..."}
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                  />
                  <div className="linkedin-input-tools">
                    {commentDraft.trim() && (
                      <button type="submit" className="linkedin-post-btn">
                        Post
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* 2. LinkedIn Sort Line: "Most relevant ▾" */}
          <div className="linkedin-filter-row">
            <button
              type="button"
              className="linkedin-filter-btn"
              onClick={() => setCommentSort((s) => (s === 'top' ? 'newest' : 'top'))}
            >
              <span>{commentSort === 'top' ? 'Most relevant' : 'Most recent'}</span>
              <ChevronDown />
            </button>
          </div>

          {/* 3. LinkedIn Comments List */}
          <div className="linkedin-comments-list">
            {sortedComments.length > 0 ? (
              sortedComments.map((c) => (
                <div key={c.id} className="linkedin-comment-thread">
                  <div className="linkedin-comment-item">
                    <div className={`linkedin-avatar ${c.accent || 'avatar-blue'}`}>
                      {c.initials || (c.user[0] || 'U').toUpperCase()}
                    </div>
                    <div className="linkedin-comment-bubble-wrap">
                      <div className="linkedin-comment-bubble">
                        <div className="linkedin-bubble-header">
                          <div className="linkedin-author-info">
                            <div className="linkedin-name-row">
                              <strong className="linkedin-author-name">{c.user}</strong>
                              {(c.isOp || c.user.toLowerCase() === problem.user.toLowerCase()) && (
                                <span className="linkedin-op-badge">Author</span>
                              )}
                            </div>
                          </div>
                          <div className="linkedin-time-more">
                            <span className="linkedin-time">{c.time}</span>
                            <button type="button" className="linkedin-more-btn" aria-label="More options">
                              <MoreHorizontal />
                            </button>
                          </div>
                        </div>
                        <p className="linkedin-comment-text">{c.text}</p>
                      </div>

                      {/* Reactions bar */}
                      <div className="linkedin-reaction-bar">
                        <button
                          type="button"
                          className={`linkedin-action-btn ${c.liked ? 'liked' : ''}`}
                          onClick={() => {
                            if (!user) {
                              onRequireAuth('comment')
                              return
                            }
                            onToggleLikeComment(problem.id, c.id)
                          }}
                        >
                          <ThumbsUp />
                          <span>{c.likes && c.likes > 0 ? c.likes : 'Like'}</span>
                        </button>
                        <span className="linkedin-action-sep">|</span>
                        <button
                          type="button"
                          className="linkedin-action-btn"
                          onClick={() => {
                            if (!user) {
                              onRequireAuth('comment')
                              return
                            }
                            handleStartReply(c.id, c.user)
                          }}
                        >
                          <MessageSquare />
                          <span>Reply</span>
                        </button>
                        {c.likes && c.likes > 0 ? (
                          <div className="linkedin-badge-corner" title={`${c.likes} likes`}>
                            <span className="linkedin-thumbsup-badge">👍</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Threaded Nested Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="linkedin-replies-nest">
                      {c.replies.map((reply) => (
                        <div key={reply.id} className="linkedin-comment-item reply-item">
                          <div className={`linkedin-avatar avatar-sm ${reply.accent || 'avatar-blue'}`}>
                            {reply.initials || (reply.user[0] || 'U').toUpperCase()}
                          </div>
                          <div className="linkedin-comment-bubble-wrap">
                            <div className="linkedin-comment-bubble">
                              <div className="linkedin-bubble-header">
                                <div className="linkedin-author-info">
                                  <div className="linkedin-name-row">
                                    <strong className="linkedin-author-name">{reply.user}</strong>
                                    {(reply.isOp || reply.user.toLowerCase() === problem.user.toLowerCase()) && (
                                      <span className="linkedin-op-badge">Author</span>
                                    )}
                                  </div>
                                </div>
                                <div className="linkedin-time-more">
                                  <span className="linkedin-time">{reply.time}</span>
                                  <button type="button" className="linkedin-more-btn" aria-label="More options">
                                    <MoreHorizontal />
                                  </button>
                                </div>
                              </div>
                              <p className="linkedin-comment-text">{reply.text}</p>
                            </div>
                            <div className="linkedin-reaction-bar">
                              <button
                                type="button"
                                className={`linkedin-action-btn ${reply.liked ? 'liked' : ''}`}
                                onClick={() => {
                                  if (!user) {
                                    onRequireAuth('comment')
                                    return
                                  }
                                  onToggleLikeComment(problem.id, reply.id)
                                }}
                              >
                                <ThumbsUp />
                                <span>{reply.likes && reply.likes > 0 ? reply.likes : 'Like'}</span>
                              </button>
                              <span className="linkedin-action-sep">|</span>
                              <button
                                type="button"
                                className="linkedin-action-btn"
                                onClick={() => {
                                  if (!user) {
                                    onRequireAuth('comment')
                                    return
                                  }
                                  handleStartReply(c.id, reply.user)
                                }}
                              >
                                <MessageSquare />
                                <span>Reply</span>
                              </button>
                              {reply.likes && reply.likes > 0 ? (
                                <div className="linkedin-badge-corner" title={`${reply.likes} likes`}>
                                  <span className="linkedin-thumbsup-badge">👍</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="comments-empty">
                <MessageSquare style={{ width: 24, height: 24, color: '#087cff' }} />
                <h4>No comments yet</h4>
                <p>Be the first to comment on this problem!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

type AuthIntent = 'post' | 'comment' | 'reaction' | 'save' | 'product' | 'general'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '782156423439-u5kbgl3s8g77p0aq48s2sekulqnqfdhm.apps.googleusercontent.com'

function GoogleLogoSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.37 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.43l4.02-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  )
}

let globalGsiCallback: ((response: any) => void) | null = null
let isGsiInitialized = false

function AuthModal({
  onClose,
  onAuthSuccess,
  intent = 'general',
  initialMode = 'signin',
}: {
  onClose: () => void
  onAuthSuccess: (user: { id: string; email?: string | null }) => void
  intent?: AuthIntent
  initialMode?: 'signin' | 'signup'
}) {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const isGoogleRendered = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function switchAuthMode(mode: 'signup' | 'signin') {
    setAuthMode(mode)
    setAuthError('')
    setAuthMessage('')
  }

  const onAuthSuccessRef = useRef(onAuthSuccess)
  onAuthSuccessRef.current = onAuthSuccess
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Initialize and render Google Identity Services button once with ProblemHub client_id
  useEffect(() => {
    let isCancelled = false
    let pollInterval: NodeJS.Timeout | null = null

    globalGsiCallback = async (response: any) => {
      if (!response?.credential) return
      setIsLoading(true)
      setAuthError('')
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        })
        if (error) {
          console.error('[ProblemHub] signInWithIdToken error:', error)
          setAuthError(error.message || 'Google sign-in failed. Please try again.')
        } else if (data?.user) {
          onAuthSuccessRef.current({ id: data.user.id, email: data.user.email })
          onCloseRef.current()
        }
      } catch (err: any) {
        console.error('[ProblemHub] Google auth error:', err)
        setAuthError(err?.message || 'Failed to authenticate with Google.')
      } finally {
        setIsLoading(false)
      }
    }

    const renderGSI = () => {
      if (typeof window === 'undefined' || isCancelled) return false
      const google = (window as any).google

      if (google?.accounts?.id && googleBtnRef.current) {
        // If already rendered or has any children, do not render again
        if (isGoogleRendered.current || googleBtnRef.current.children.length > 0) {
          return true
        }

        try {
          if (!isGsiInitialized) {
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (res: any) => {
                globalGsiCallback?.(res)
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            })
            isGsiInitialized = true
          }

          const calculatedWidth = typeof window !== 'undefined'
            ? Math.min(380, Math.max(260, Math.floor(window.innerWidth - 64)))
            : 380

          googleBtnRef.current.innerHTML = ''
          google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: calculatedWidth,
          })

          isGoogleRendered.current = true
          return true
        } catch (e) {
          console.warn('[ProblemHub] Google GIS render notice:', e)
        }
      }
      return false
    }

    if (!renderGSI()) {
      pollInterval = setInterval(() => {
        if (renderGSI() && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }, 80)
    }

    const timeout = setTimeout(() => {
      if (pollInterval) clearInterval(pollInterval)
    }, 3000)

    return () => {
      isCancelled = true
      if (pollInterval) clearInterval(pollInterval)
      clearTimeout(timeout)
      globalGsiCallback = null
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
      }
      isGoogleRendered.current = false
    }
  }, [])

  async function handleEmailAuth(event?: React.FormEvent) {
    event?.preventDefault()
    setAuthError('')
    setAuthMessage('')
    if (!email.trim() || !password) {
      setAuthError('Enter your email and password to continue.')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        if (data.session && data.user) {
          onAuthSuccess({ id: data.user.id, email: data.user.email })
        } else {
          setAuthMessage(
            'Account created! Please check your email inbox to verify your account, then sign in.'
          )
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (data.user && data.session) {
          onAuthSuccess({ id: data.user.id, email: data.user.email })
        } else {
          setAuthError('Could not start your session. Please check your credentials.')
        }
      }
    } catch (err: any) {
      console.log('[ProblemHub] Email auth error:', err)
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid email or password')
      ) {
        setAuthError('Invalid email or password.')
      } else if (message.includes('email not confirmed')) {
        setAuthError('Please confirm your email address before signing in.')
      } else if (message.includes('password should be at least')) {
        setAuthError('Password should be at least 6 characters.')
      } else {
        setAuthError(err?.message || 'Unable to authenticate. Please check your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const intentDetails = useMemo(() => {
    switch (intent) {
      case 'post':
        return {
          kicker: 'ProblemHub Community',
          title:
            authMode === 'signup'
              ? 'Create Account to Share a Problem'
              : 'Sign in to Share a Problem',
          subtitle:
            'Tell the community what you’re stuck on to get advice, find existing tools, or collaborate on solutions.',
        }
      case 'comment':
        return {
          kicker: 'Join the Discussion',
          title:
            authMode === 'signup'
              ? 'Create Account to Comment & Reply'
              : 'Sign in to Comment & Reply',
          subtitle:
            'Share your thoughts, advice, or reply to community members solving real challenges.',
        }
      case 'reaction':
        return {
          kicker: 'Community Feedback',
          title: authMode === 'signup' ? 'Create Account to Vote' : 'Sign in to Vote',
          subtitle:
            'Vote whether you experience this problem or want to build/propose a solution.',
        }
      case 'save':
        return {
          kicker: 'Personal Bookmarks',
          title:
            authMode === 'signup'
              ? 'Create Account to Bookmark'
              : 'Sign in to Bookmark Problems',
          subtitle:
            'Save this problem to your personal collection to track discussions and progress.',
        }
      case 'product':
        return {
          kicker: 'Showcase & Products',
          title:
            authMode === 'signup'
              ? 'Create Account to Add Product'
              : 'Sign in to Submit Product',
          subtitle:
            'Reach thousands of active professionals and builders solving real problems.',
        }
      default:
        return {
          kicker: authMode === 'signup' ? 'Create an Account' : 'Welcome to ProblemHub',
          title: authMode === 'signup' ? 'Sign up for ProblemHub' : 'Sign in to ProblemHub',
          subtitle:
            'Discover opportunities, share real challenges, and build better solutions together.',
        }
    }
  }, [intent, authMode])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="post-modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={intentDetails.title}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button">
          <X />
        </button>

        <div className="modal-kicker">{intentDetails.kicker}</div>
        <h2>{intentDetails.title}</h2>
        <p className="modal-subtitle">{intentDetails.subtitle}</p>

        <div className="modal-auth">
          <button
            type="button"
            className={authMode === 'signin' ? 'selected' : ''}
            onClick={() => switchAuthMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === 'signup' ? 'selected' : ''}
            onClick={() => switchAuthMode('signup')}
          >
            Sign up
          </button>
        </div>

        <div className="google-btn-wrapper">
          <div ref={googleBtnRef} className="google-btn-container" />
        </div>

        <div className="modal-divider">
          <span>or with email</span>
        </div>

        <form onSubmit={handleEmailAuth} className="email-fields">
          <input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder={
              authMode === 'signup' ? 'Password (min. 6 characters)' : 'Password'
            }
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
          />
          <button type="submit" className="email-continue" disabled={isLoading}>
            {isLoading
              ? 'Please wait...'
              : authMode === 'signup'
              ? 'Create account with email'
              : 'Sign in with email'}
          </button>
        </form>

        {authError && (
          <p className="auth-error" role="alert">
            {authError}
          </p>
        )}
        {authMessage && (
          <p className="auth-message" role="status">
            {authMessage}
          </p>
        )}

        <p className="auth-required">
          Sign in or create an account to post, vote, and comment. Without login, ProblemHub is read-only.
        </p>
      </section>
    </div>
  )
}

function PostProblemModal({
  onClose,
  onSubmit,
  user,
}: {
  onClose: () => void
  onSubmit: (problem: Problem) => Promise<void>
  user: { id: string; email?: string | null }
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [frequency, setFrequency] = useState('')
  const [timeWasted, setTimeWasted] = useState('')
  const [currentSolution, setCurrentSolution] = useState('')
  const [impact, setImpact] = useState('')
  const [impactDetail, setImpactDetail] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const availableLookingTags = ['advice', 'existing tools', 'build a solution', 'collaborate']

  function toggleLookingTag(tag: string) {
    setLookingFor((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !description.trim() || !user) return
    setIsLoading(true)
    try {
      const author = user.email ? user.email.split('@')[0] : 'Anonymous'
      const catClass = category.toLowerCase() === 'marketing' ? 'marketing' : category.toLowerCase() === 'development' ? 'development' : 'marketing'

      // Split multiline description into paragraphs
      const paragraphs = description
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)

      await onSubmit({
        id: `local-${Date.now()}`,
        user: author,
        initials: (author.charAt(0) || '👨🏻‍💼').toUpperCase(),
        time: 'just now',
        category: category || 'Other',
        categoryClass: catClass,
        title: title.trim(),
        paragraphs: paragraphs.length > 0 ? paragraphs : [description.trim()],
        frequency: frequency.trim(),
        timeWasted: timeWasted.trim(),
        currentSolution: currentSolution.trim(),
        impact: impact.trim(),
        impactDetail: impactDetail.trim() || undefined,
        lookingFor: lookingFor,
        comments: 0,
        people: 1,
        accent: 'avatar-blue',
        userId: user.id,
        commentsList: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="post-modal" role="dialog" aria-modal="true" aria-label="Share a problem">
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button"><X /></button>
        <form onSubmit={submit} className="post-form">
          <div className="modal-kicker">ProblemHub Community</div>
          <h2 style={{ margin: '0 0 8px' }}>Share a Problem</h2>
          <p className="modal-subtitle" style={{ margin: '0 0 14px' }}>
            Tell the community what you&apos;re stuck on. Your post will appear in the feed.
          </p>
          
          <label>
            Title
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. How do I track which marketing campaigns actually generate revenue?"
            />
          </label>

          <label>
            Description
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe your pain point, manual effort, or why current solutions fall short..."
            />
          </label>

          <div className="form-grid-2">
            <label>
              Category
              <input
                list="category-suggestions"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Select or enter category..."
              />
              <datalist id="category-suggestions">
                <option value="Marketing" />
                <option value="Development" />
                <option value="Operations" />
                <option value="Finance" />
                <option value="Design" />
                <option value="Sales" />
                <option value="AI & Machine Learning" />
                <option value="Product Management" />
                <option value="Customer Support" />
                <option value="DevOps & Cloud" />
                <option value="Other" />
              </datalist>
            </label>

            <label>
              Frequency
              <input
                required
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                placeholder="e.g. Weekly, Daily, Monthly"
              />
            </label>
          </div>

          <div className="form-grid-2">
            <label>
              Time wasted
              <input
                required
                value={timeWasted}
                onChange={(event) => setTimeWasted(event.target.value)}
                placeholder="e.g. 4–5 hours"
              />
            </label>

            <label>
              Current solution
              <input
                required
                value={currentSolution}
                onChange={(event) => setCurrentSolution(event.target.value)}
                placeholder="e.g. Excel + manual exports"
              />
            </label>
          </div>

          <div className="form-grid-2">
            <label>
              Impact
              <input
                required
                value={impact}
                onChange={(event) => setImpact(event.target.value)}
                placeholder="e.g. High, Critical, Medium"
              />
            </label>

            <label>
              Impact detail (optional)
              <input
                value={impactDetail}
                onChange={(event) => setImpactDetail(event.target.value)}
                placeholder="e.g. (time + accuracy)"
              />
            </label>
          </div>

          <div className="looking-tag-group">
            <span>Looking for:</span>
            <div className="looking-tag-row">
              {availableLookingTags.map((tag) => {
                const isSelected = lookingFor.includes(tag)
                return (
                  <button
                    type="button"
                    key={tag}
                    className={`tag-toggle-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleLookingTag(tag)}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <button className="submit-problem" type="submit" disabled={isLoading}>
            {isLoading ? 'Posting...' : 'Share Problem'}
          </button>
        </form>
      </section>
    </div>
  )
}

function AddProductModal({
  onClose,
  onSuccess,
  user,
}: {
  onClose: () => void
  onSuccess: (msg: string) => void
  user: { id: string; email?: string | null } | null
}) {
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    if (!user) {
      setErrorMsg('You must be signed in to submit a product.')
      return
    }

    const cleanWebsite = website.trim()
    const cleanEmail = email.trim()

    if (!cleanWebsite || !cleanEmail) {
      setErrorMsg('Please enter both website and email.')
      return
    }

    const normalizedWebsite = /^https?:\/\//i.test(cleanWebsite)
      ? cleanWebsite
      : `https://${cleanWebsite}`

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('problemhub_product_requests').insert({
        website: normalizedWebsite,
        email: cleanEmail,
        status: 'pending',
      })
      if (error) {
        console.warn('Supabase product request notice:', error)
      }
    } catch (err) {
      console.warn('Product request submission error:', err)
    } finally {
      setIsLoading(false)
      setSubmitted(true)
      onSuccess('Product submission received! You will be notified soon on email.')
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="post-modal product-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add Product"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <X />
        </button>

        {submitted ? (
          <div className="product-modal-success">
            <div className="product-success-icon-wrap">
              <Check style={{ width: 28, height: 28 }} />
            </div>
            <h2>Submission Received!</h2>
            <p className="product-success-highlight">
              You will be notified soon on email.
            </p>
            <p className="product-success-sub">
              We have received your product submission for listing and review. Our team will verify your details and follow up at <strong>{email}</strong>.
            </p>
            <div className="submitted-summary-card">
              <div className="summary-line">
                <span className="summary-label">Website:</span>
                <span className="summary-val">{website}</span>
              </div>
              <div className="summary-line">
                <span className="summary-label">Email:</span>
                <span className="summary-val">{email}</span>
              </div>
            </div>
            <button
              type="button"
              className="product-modal-done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="modal-kicker">Showcase & Products</div>
            <h2>Add Your Product</h2>
            <p className="modal-subtitle">
              Reach thousands of active professionals and builders solving real problems. Submit your product details below to get listed.
            </p>

            <form onSubmit={handleSubmit} className="post-form product-submit-form">
              {errorMsg && <div className="auth-error">{errorMsg}</div>}

              <label>
                Website
                <div className="modal-input-wrap">
                  <Globe className="modal-field-icon" />
                  <input
                    type="text"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourproduct.com"
                    autoFocus
                  />
                </div>
              </label>

              <label>
                Email
                <div className="modal-input-wrap">
                  <Mail className="modal-field-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@yourcompany.com"
                  />
                </div>
              </label>

              <button className="submit-problem" type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Product'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<'Latest' | 'Top' | 'Posts' | 'Saved'>('Latest')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const [posted, setPosted] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productList, setProductList] = useState<SponsoredProduct[]>(DEFAULT_PRODUCTS)
  const [displayedProducts, setDisplayedProducts] = useState<SponsoredProduct[]>(DEFAULT_PRODUCTS)
  const [swappingSlot, setSwappingSlot] = useState<number | null>(null)
  const displayedProductsRef = useRef(displayedProducts)
  displayedProductsRef.current = displayedProducts

  // 3-second random change: keeps up to 5 boxes, rotates extra products in randomly if more than 5
  useEffect(() => {
    if (productList.length <= 5) return

    const timer = setInterval(() => {
      const current = displayedProductsRef.current
      if (current.length === 0) return
      const displayedNames = new Set(current.map((p) => p.name))
      const unusedPool = productList.filter((p) => !displayedNames.has(p.name))

      if (unusedPool.length === 0) return

      const randomProduct = unusedPool[Math.floor(Math.random() * unusedPool.length)]
      const targetSlot = Math.floor(Math.random() * Math.min(5, current.length))

      setSwappingSlot(targetSlot)
      setTimeout(() => setSwappingSlot(null), 550)

      setDisplayedProducts((prev) => {
        const next = [...prev]
        next[targetSlot] = randomProduct
        return next
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [productList])

  const [showPostModal, setShowPostModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authIntent, setAuthIntent] = useState<AuthIntent>('general')
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const [tabAnimKey, setTabAnimKey] = useState(0)
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null)

  function handleTabClick(tab: 'Latest' | 'Top' | 'Posts' | 'Saved') {
    setActiveTab(tab)
    setTabAnimKey((prev) => prev + 1)

    const feedEl = document.querySelector('.feed') as HTMLElement | null
    if (feedEl) {
      feedEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    setShowHeader(true)
    setIsScrolled(false)

    // If user clicked the current tab, re-fetch in background to refresh posts
    if (loadDataRef.current && tab === activeTab) {
      loadDataRef.current()
    }
  }

  function requireAuth(intent: AuthIntent = 'general', mode: 'signin' | 'signup' = 'signin') {
    setAuthIntent(intent)
    setAuthInitialMode(mode)
    setShowAuthModal(true)
  }

  function handleAuthSuccess(authenticatedUser: { id: string; email?: string | null }) {
    setUser(authenticatedUser)
    setShowAuthModal(false)
    if (authIntent === 'post') {
      setShowPostModal(true)
    } else if (authIntent === 'product') {
      setShowAddProductModal(true)
    } else {
      setToastMessage(`Signed in as ${authenticatedUser.email || 'User'}`)
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  // Dynamically derive categories from live problems in the community
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    problems.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim())
      }
    })
    return ['All', ...Array.from(set)]
  }, [problems])

  // Smart header on scroll-up
  const [showHeader, setShowHeader] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const feedEl = document.querySelector('.feed') as HTMLElement | null

    const handleScroll = () => {
      const currentScrollY = feedEl && feedEl.scrollTop > 0 ? feedEl.scrollTop : window.scrollY
      const prevScrollY = lastScrollY.current

      if (currentScrollY <= 30) {
        setShowHeader(true)
        setIsScrolled(false)
        lastScrollY.current = currentScrollY
        return
      }

      setIsScrolled(true)

      const delta = currentScrollY - prevScrollY
      if (Math.abs(delta) < 6) return

      if (delta > 0) {
        // User scrolling DOWN -> hide header for comfortable reading
        setShowHeader(false)
      } else {
        // User scrolling UP -> reveal search bar, tabs, and Add Post button
        setShowHeader(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    if (feedEl) feedEl.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (feedEl) feedEl.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Enable scrolling the feed when scrolling anywhere on the screen (left sidebar, right sidebar, margins)
  useEffect(() => {
    let startY = 0

    const handleGlobalWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // If user is inside an interactive modal, input, or textarea, don't intercept
      if (target.closest('.modal-backdrop, .modal-card, .auth-modal-card, textarea, input, select')) {
        return
      }

      const feedEl = document.querySelector('.feed') as HTMLElement | null
      if (!feedEl) return

      // If wheel event originated outside the feed (e.g. left rail, right rail, body margins), forward it to the feed
      if (!feedEl.contains(target)) {
        feedEl.scrollTop += e.deltaY
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        startY = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || target.closest('.modal-backdrop, .modal-card, .auth-modal-card, textarea, input, select')) {
        return
      }
      const feedEl = document.querySelector('.feed') as HTMLElement | null
      if (!feedEl || feedEl.contains(target)) return

      if (e.touches.length > 0) {
        const currentY = e.touches[0].clientY
        const delta = startY - currentY
        startY = currentY
        feedEl.scrollTop += delta
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }
      const feedEl = document.querySelector('.feed') as HTMLElement | null
      if (!feedEl) return

      if (e.key === 'ArrowDown') {
        feedEl.scrollTop += 60
      } else if (e.key === 'ArrowUp') {
        feedEl.scrollTop -= 60
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        feedEl.scrollTop += window.innerHeight * 0.75
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        feedEl.scrollTop -= window.innerHeight * 0.75
      }
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const loadDataRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const { data: userData } = await supabase.auth.getUser()
        const currentUser = userData?.user ? { id: userData.user.id, email: userData.user.email } : null
        if (currentUser) {
          setUser(currentUser)
        }

        // 1. Fetch Dynamic Products
        try {
          const { data: prodData, error: prodErr } = await supabase
            .from('problemhub_products')
            .select('*')
            .order('created_at', { ascending: false })

          if (!prodErr && prodData && prodData.length > 0) {
            const mappedProds: SponsoredProduct[] = prodData.map((p: any) => ({
              name: p.name,
              description: p.description,
              className: p.class_name || (p.name?.toLowerCase() === 'sorget' ? 'product-sorget' : 'product-blue'),
              mark: p.mark || (p.name ? p.name.charAt(0).toUpperCase() : '★'),
              url: p.url || '#',
              logoUrl: p.logo_url || (p.name?.toLowerCase() === 'sorget' ? '/sorget-logo.png' : undefined),
            }))
            const hasSorget = mappedProds.some((p) => p.name.toLowerCase() === 'sorget')
            const finalProds = hasSorget ? mappedProds : [...DEFAULT_PRODUCTS, ...mappedProds]
            setProductList(finalProds)
            setDisplayedProducts(finalProds.slice(0, 5))
          } else {
            setProductList(DEFAULT_PRODUCTS)
            setDisplayedProducts(DEFAULT_PRODUCTS.slice(0, 5))
          }
        } catch (e) {
          console.warn('Products fetch error:', e)
          setProductList(DEFAULT_PRODUCTS)
          setDisplayedProducts(DEFAULT_PRODUCTS.slice(0, 5))
        }

        // 2. Fetch User Saved Posts (if logged in)
        const savedSet = new Set<string>()
        if (currentUser?.id) {
          try {
            const { data: savedData } = await supabase
              .from('problemhub_saved')
              .select('problem_id')
              .eq('user_id', currentUser.id)
            if (savedData) {
              savedData.forEach((s: any) => savedSet.add(s.problem_id))
            }
          } catch {}
        }

        // 3. Fetch Comments & Replies
        const commentsByProblem: Record<string, CommentItem[]> = {}
        try {
          const { data: commentsData } = await supabase
            .from('problemhub_comments')
            .select('*')
            .order('created_at', { ascending: true })

          if (commentsData && commentsData.length > 0) {
            const rawParents: Record<string, any[]> = {}
            const rawReplies: Record<string, any[]> = {}

            for (const item of commentsData) {
              if (!item.parent_id) {
                if (!rawParents[item.problem_id]) rawParents[item.problem_id] = []
                rawParents[item.problem_id].push(item)
              } else {
                if (!rawReplies[item.parent_id]) rawReplies[item.parent_id] = []
                rawReplies[item.parent_id].push(item)
              }
            }

            for (const probId of Object.keys(rawParents)) {
              commentsByProblem[probId] = rawParents[probId].map((parent: any) => ({
                id: parent.id,
                userId: parent.user_id,
                user: parent.author_name,
                initials: parent.author_initials || (parent.author_name[0] || 'U').toUpperCase(),
                accent: parent.author_accent || 'avatar-blue',
                text: parent.text,
                time: formatRelativeTime(parent.created_at),
                likes: parent.likes_count || 0,
                liked: false,
                isOp: parent.is_op,
                parentId: null,
                replies: (rawReplies[parent.id] || []).map((rep: any) => ({
                  id: rep.id,
                  userId: rep.user_id,
                  user: rep.author_name,
                  initials: rep.author_initials || (rep.author_name[0] || 'U').toUpperCase(),
                  accent: rep.author_accent || 'avatar-green',
                  text: rep.text,
                  time: formatRelativeTime(rep.created_at),
                  likes: rep.likes_count || 0,
                  liked: false,
                  isOp: rep.is_op,
                  parentId: parent.id,
                })),
              }))
            }
          }
        } catch (e) {
          console.warn('Comments fetch error:', e)
        }

        // 4. Fetch User Reactions (Problem & Solution votes) for logged-in user
        const userReactionsSet = new Set<string>()
        if (currentUser?.id) {
          try {
            const { data: rxData, error: rxErr } = await supabase
              .from('problemhub_reactions')
              .select('problem_id, reaction_type')
              .eq('user_id', currentUser.id)
            if (!rxErr && rxData) {
              rxData.forEach((r: any) => userReactionsSet.add(`${r.problem_id}:${r.reaction_type}`))
            }
          } catch (e) {
            console.warn('Reactions fetch note (dynamic mode):', e)
          }
        }

        // 5. Fetch Dynamic Posts
        const { data: postsData, error: postsErr } = await supabase
          .from('problemhub_posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (!postsErr && postsData && postsData.length > 0) {
          const mappedPosts: Problem[] = postsData.map((post: any) => {
            const postComments = commentsByProblem[post.id] || []
            const totalCount = postComments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0) || post.comments_count || 0
            const hasProblemVote = userReactionsSet.has(`${post.id}:problem`)
            let hasSolutionVote = userReactionsSet.has(`${post.id}:solution`)
            if (hasProblemVote && hasSolutionVote) {
              hasSolutionVote = false
            }

            return {
              id: post.id,
              userId: post.user_id,
              user: post.author_name || 'Community Member',
              initials: post.author_initials || (post.author_name ? post.author_name.charAt(0) : 'U').toUpperCase(),
              time: formatRelativeTime(post.created_at),
              category: post.category || 'General',
              categoryClass: (post.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-'),
              title: post.title,
              paragraphs: post.description ? post.description.split('\n\n') : [''],
              frequency: post.frequency || '',
              timeWasted: post.time_wasted || '',
              currentSolution: post.current_solution || '',
              impact: post.impact || '',
              impactDetail: post.impact_detail || '',
              lookingFor: post.looking_for || [],
              comments: totalCount,
              people: post.people_count || 1,
              problemVotes: post.problem_votes ?? 0,
              solutionVotes: post.solution_votes ?? 0,
              userVotedProblem: hasProblemVote,
              userVotedSolution: hasSolutionVote,
              accent: post.author_accent || 'avatar-blue',
              saved: savedSet.has(post.id),
              commentsList: postComments,
            }
          })

          // Check if a specific post is requested in URL query ?post=<id> or hash #problem-<id>
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const postParam = params.get('post')
            const hash = window.location.hash
            const hashPost = hash.startsWith('#problem-') ? hash.replace('#problem-', '') : null
            const targetId = postParam || hashPost

            if (targetId && !mappedPosts.some((p) => p.id === targetId)) {
              try {
                const { data: singlePost } = await supabase
                  .from('problemhub_posts')
                  .select('*')
                  .eq('id', targetId)
                  .single()

                if (singlePost) {
                  const { data: singleComments } = await supabase
                    .from('problemhub_comments')
                    .select('*')
                    .eq('post_id', targetId)
                    .order('created_at', { ascending: true })

                  const formattedComments = (singleComments || []).map((c: any) => ({
                    id: c.id,
                    userId: c.user_id,
                    user: c.author_name || 'Community Member',
                    initials: (c.author_name || 'U').charAt(0).toUpperCase(),
                    accent: 'avatar-blue',
                    text: c.comment_text,
                    time: formatRelativeTime(c.created_at),
                    likes: c.likes_count || 0,
                    liked: userLikedComments.has(c.id),
                    parentId: c.parent_id || null,
                  }))

                  mappedPosts.unshift({
                    id: singlePost.id,
                    userId: singlePost.user_id,
                    user: singlePost.author_name || 'Community Member',
                    initials: singlePost.author_initials || (singlePost.author_name ? singlePost.author_name.charAt(0) : 'U').toUpperCase(),
                    time: formatRelativeTime(singlePost.created_at),
                    category: singlePost.category || 'General',
                    categoryClass: (singlePost.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    title: singlePost.title,
                    paragraphs: singlePost.description ? singlePost.description.split('\n\n') : [''],
                    frequency: singlePost.frequency || '',
                    timeWasted: singlePost.time_wasted || '',
                    currentSolution: singlePost.current_solution || '',
                    impact: singlePost.impact || '',
                    impactDetail: singlePost.impact_detail || '',
                    lookingFor: singlePost.looking_for || [],
                    comments: formattedComments.length,
                    people: singlePost.people_count || 1,
                    problemVotes: singlePost.problem_votes ?? 0,
                    solutionVotes: singlePost.solution_votes ?? 0,
                    userVotedProblem: userProblemReactions.has(singlePost.id),
                    userVotedSolution: userSolutionReactions.has(singlePost.id),
                    accent: singlePost.author_accent || 'avatar-blue',
                    saved: savedSet.has(singlePost.id),
                    commentsList: formattedComments,
                  })
                }
              } catch (singleErr) {
                console.warn('Could not fetch direct targeted post:', singleErr)
              }
            }
          }

          setProblems(mappedPosts)
        } else if (!postsErr && postsData && postsData.length === 0) {
          setProblems([])
        }
      } catch (err) {
        console.warn('Supabase initialization handled in dynamic mode:', err)
      }
    }

    loadDataRef.current = loadData
    loadData().then(() => {
      // Small delay to let React render, then fade in
      requestAnimationFrame(() => setPageReady(true))

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const postParam = params.get('post')
        const hash = window.location.hash
        const hashPost = hash.startsWith('#problem-') ? hash.replace('#problem-', '') : null
        const targetId = postParam || hashPost

        if (targetId) {
          setHighlightedPostId(targetId)
          setTimeout(() => {
            const el = document.getElementById(`problem-${targetId}`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 350)
        }
      }
    })

    let listener: { subscription?: { unsubscribe: () => void } } | null = null
    try {
      const supabase = createClient()
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
      )
      listener = data
    } catch {}

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  // Listen to browser navigation changes (Back/Forward buttons, hash navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUrlTargetChange = () => {
      const params = new URLSearchParams(window.location.search)
      const postParam = params.get('post')
      const hash = window.location.hash
      const hashPost = hash.startsWith('#problem-') ? hash.replace('#problem-', '') : null
      const targetId = postParam || hashPost

      if (targetId) {
        setHighlightedPostId(targetId)
        setTimeout(() => {
          const el = document.getElementById(`problem-${targetId}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
      } else {
        setHighlightedPostId(null)
      }
    }

    window.addEventListener('popstate', handleUrlTargetChange)
    window.addEventListener('hashchange', handleUrlTargetChange)
    return () => {
      window.removeEventListener('popstate', handleUrlTargetChange)
      window.removeEventListener('hashchange', handleUrlTargetChange)
    }
  }, [])

  const filteredProblems = useMemo(() => {
    let list = problems.filter((problem) => {
      // If a specific post is being directly viewed/shared, always include it in the feed
      if (highlightedPostId && problem.id === highlightedPostId) {
        return true
      }
      const textMatch = `${problem.title} ${problem.category} ${problem.user} ${problem.paragraphs.join(' ')}`.toLowerCase().includes(query.toLowerCase())
      const categoryMatch = selectedCategory === 'All' || problem.category.toLowerCase() === selectedCategory.toLowerCase()
      return textMatch && categoryMatch
    })

    if (activeTab === 'Top') {
      list = [...list].sort((a, b) => {
        const scoreB = ((b.problemVotes || 0) + (b.solutionVotes || 0)) * 3 + (b.comments || 0) * 2 + (b.people || 0)
        const scoreA = ((a.problemVotes || 0) + (a.solutionVotes || 0)) * 3 + (a.comments || 0) * 2 + (a.people || 0)
        return scoreB - scoreA
      })
    } else if (activeTab === 'Posts') {
      if (!user) return []
      const userHandle = (user.email?.split('@')[0] || '').toLowerCase()
      const userId = user.id

      list = list.filter((problem) => {
        const isAuthor = problem.userId === userId || problem.user.toLowerCase() === userHandle
        const hasReplied = problem.commentsList?.some(
          (c) =>
            c.userId === userId ||
            c.user.toLowerCase() === userHandle ||
            c.replies?.some((r) => r.userId === userId || r.user.toLowerCase() === userHandle)
        )
        return isAuthor || hasReplied
      })
    } else if (activeTab === 'Saved') {
      list = list.filter((problem) => Boolean(problem.saved))
    }
    return list
  }, [problems, query, selectedCategory, activeTab, user])

  async function handleSignOut() {
    try {
      await createClient().auth.signOut()
    } catch {}
    setUser(null)
    setShowPostModal(false)
    setShowAddProductModal(false)
    setShowAuthModal(false)
    setProblems((prev) =>
      prev.map((p) => ({
        ...p,
        userVotedProblem: false,
        userVotedSolution: false,
        saved: false,
      }))
    )
    setToastMessage('Signed out successfully.')
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleToggleReaction(problemId: string, type: 'problem' | 'solution') {
    if (!user) {
      requireAuth('reaction')
      return
    }
    const voterId = user.id
    let nextVotedProblem = false
    let nextVotedSolution = false
    let nextProblemCount = 0
    let nextSolutionCount = 0

    // 1. Instant optimistic UI update (0ms latency, strictly one at a time)
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id !== problemId) return p

        const currentProblemVoted = Boolean(p.userVotedProblem)
        const currentSolutionVoted = Boolean(p.userVotedSolution)
        let pVotes = p.problemVotes || 0
        let sVotes = p.solutionVotes || 0

        if (type === 'problem') {
          if (currentProblemVoted) {
            // Already voted problem -> toggle off (unvote)
            nextVotedProblem = false
            nextVotedSolution = false
            pVotes = Math.max(0, pVotes - 1)
          } else {
            // Activate Problem vote
            nextVotedProblem = true
            pVotes = pVotes + 1
            // If Solution was active, switch from Solution to Problem
            if (currentSolutionVoted) {
              nextVotedSolution = false
              sVotes = Math.max(0, sVotes - 1)
            } else {
              nextVotedSolution = false
            }
          }
        } else {
          // type === 'solution'
          if (currentSolutionVoted) {
            // Already voted solution -> toggle off (unvote)
            nextVotedSolution = false
            nextVotedProblem = false
            sVotes = Math.max(0, sVotes - 1)
          } else {
            // Activate Solution vote
            nextVotedSolution = true
            sVotes = sVotes + 1
            // If Problem was active, switch from Problem to Solution
            if (currentProblemVoted) {
              nextVotedProblem = false
              pVotes = Math.max(0, pVotes - 1)
            } else {
              nextVotedProblem = false
            }
          }
        }

        nextProblemCount = pVotes
        nextSolutionCount = sVotes

        return {
          ...p,
          userVotedProblem: nextVotedProblem,
          userVotedSolution: nextVotedSolution,
          problemVotes: nextProblemCount,
          solutionVotes: nextSolutionCount,
        }
      })
    )

    const activeType = nextVotedProblem ? 'problem' : nextVotedSolution ? 'solution' : null

    // 2. Persist reaction to Supabase asynchronously
    try {
      const supabase = createClient()

      // Remove any prior reaction for this user on this post
      await supabase
        .from('problemhub_reactions')
        .delete()
        .match({
          problem_id: problemId,
          user_id: voterId,
        })

      // If user selected a reaction, insert the new one
      if (activeType) {
        await supabase.from('problemhub_reactions').insert({
          problem_id: problemId,
          user_id: voterId,
          reaction_type: activeType,
        })
      }

      // Synchronize counters on problemhub_posts
      await supabase
        .from('problemhub_posts')
        .update({
          problem_votes: nextProblemCount,
          solution_votes: nextSolutionCount,
        })
        .eq('id', problemId)
    } catch (err) {
      console.warn('Supabase reaction sync error:', err)
    }
  }

  async function handleSubmit(problem: Problem) {
    if (!user) {
      requireAuth('post')
      return
    }
    let createdId = problem.id

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('problemhub_posts')
        .insert({
          user_id: user.id,
          author_name: problem.user,
          author_initials: problem.initials,
          author_accent: problem.accent,
          title: problem.title,
          category: problem.category,
          description: problem.paragraphs.join('\n\n'),
          frequency: problem.frequency,
          time_wasted: problem.timeWasted,
          current_solution: problem.currentSolution,
          impact: problem.impact,
          impact_detail: problem.impactDetail,
          looking_for: problem.lookingFor,
          comments_count: 0,
          people_count: 1,
          problem_votes: 0,
          solution_votes: 0,
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        createdId = data.id
      } else {
        console.warn('Supabase post stored in local session:', error)
      }
    } catch (err) {
      console.warn('Supabase insert note, storing in local feed:', err)
    }

    setProblems((current) => [
      {
        ...problem,
        id: createdId,
        userId: user.id,
        problemVotes: 0,
        solutionVotes: 0,
        userVotedProblem: false,
        userVotedSolution: false,
      },
      ...current,
    ])
    setPosted(true)
    setShowPostModal(false)
  }

  async function handleToggleSave(id: string) {
    if (!user) {
      requireAuth('save')
      return
    }

    let willSave = false
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          willSave = !p.saved
          return { ...p, saved: willSave }
        }
        return p
      })
    )

    try {
      const supabase = createClient()
      if (willSave) {
        await supabase.from('problemhub_saved').insert({
          user_id: user.id,
          problem_id: id,
        })
      } else {
        await supabase
          .from('problemhub_saved')
          .delete()
          .match({ user_id: user.id, problem_id: id })
      }
    } catch (err) {
      console.warn('Saved sync error:', err)
    }
  }

  async function handleAddComment(problemId: string, text: string, parentId?: string | null) {
    if (!user) {
      requireAuth('comment')
      return
    }

    const author = user.email ? user.email.split('@')[0] : 'Community Member'
    const newCommentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newComment: CommentItem = {
      id: newCommentId,
      userId: user.id,
      user: author,
      initials: (author[0] || 'U').toUpperCase(),
      accent: 'avatar-emerald',
      text,
      time: 'just now',
      likes: 0,
      liked: false,
      parentId: parentId || null,
      replies: [],
    }

    // Persist to Supabase
    try {
      const supabase = createClient()
      await supabase.from('problemhub_comments').insert({
        id: newCommentId,
        problem_id: problemId,
        parent_id: parentId || null,
        user_id: user.id,
        author_name: author,
        author_initials: (author[0] || 'U').toUpperCase(),
        author_accent: 'avatar-emerald',
        text,
        likes_count: 0,
        is_op: false,
      })
    } catch (err) {
      console.warn('Comment saved locally:', err)
    }

    const updater = (prevProblems: Problem[]) =>
      prevProblems.map((p) => {
        if (p.id !== problemId) return p
        const list = p.commentsList || []
        let updatedList: CommentItem[]

        if (parentId) {
          updatedList = list.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              }
            }
            return c
          })
        } else {
          updatedList = [...list, newComment]
        }

        const totalCount = updatedList.reduce(
          (acc, cur) => acc + 1 + (cur.replies ? cur.replies.length : 0),
          0
        )

        return {
          ...p,
          comments: totalCount,
          commentsList: updatedList,
        }
      })

    setProblems(updater)
  }

  async function handleToggleLikeComment(problemId: string, commentId: string) {
    if (!user) {
      requireAuth('comment')
      return
    }

    let nextLikes = 0
    let isLikedNow = false

    const updater = (prevProblems: Problem[]) =>
      prevProblems.map((p) => {
        if (p.id !== problemId) return p
        const list = p.commentsList || []

        const updateItem = (item: CommentItem): CommentItem => {
          if (item.id === commentId) {
            isLikedNow = !item.liked
            nextLikes = isLikedNow ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1)
            return {
              ...item,
              liked: isLikedNow,
              likes: nextLikes,
            }
          }
          if (item.replies && item.replies.length > 0) {
            return {
              ...item,
              replies: item.replies.map(updateItem),
            }
          }
          return item
        }

        return {
          ...p,
          commentsList: list.map(updateItem),
        }
      })

    setProblems(updater)

    try {
      const supabase = createClient()
      await supabase
        .from('problemhub_comments')
        .update({ likes_count: nextLikes })
        .eq('id', commentId)
    } catch {}
  }

  async function handleShare(problem: Problem) {
    const postUrl = `${window.location.origin}/?post=${problem.id}`

    // 1. Update address bar to post's unique URL without reloading
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/?post=${problem.id}`)
    }

    // 2. Visually focus and scroll smoothly to the post
    setHighlightedPostId(problem.id)
    const el = document.getElementById(`problem-${problem.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // 3. Copy direct link to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(postUrl)
        setToastMessage('Link copied to clipboard!')
        setTimeout(() => setToastMessage(null), 3000)
        return
      } catch {}
    }
    setToastMessage('Link copied to clipboard!')
    setTimeout(() => setToastMessage(null), 3000)
  }


  // Smooth refresh: fade out, re-fetch data, scroll to top, reset state, fade in
  async function refreshApp() {
    setIsRefreshing(true)

    // Scroll feed container and window to top
    const feedEl = document.querySelector('.feed') as HTMLElement | null
    if (feedEl) {
      feedEl.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setShowHeader(true)
    setIsScrolled(false)

    // Wait for the fade-out transition
    await new Promise((r) => setTimeout(r, 200))
    // Reset UI state
    setActiveTab('Latest')
    setSelectedCategory('All')
    setShowFilters(false)
    setQuery('')
    setPosted(false)
    setShowPostModal(false)
    setShowAddProductModal(false)
    setToastMessage(null)
    setHighlightedPostId(null)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', window.location.pathname)
    }

    // Re-fetch all data
    if (loadDataRef.current) {
      await loadDataRef.current()
    }

    setTabAnimKey((prev) => prev + 1)
    // Small pause then fade back in
    await new Promise((r) => setTimeout(r, 60))
    setIsRefreshing(false)
  }

  return (
    <>
      {/* Loading Splash — shows ProblemHub logo while data loads */}
      <div className={`splash-screen ${pageReady && !isRefreshing ? 'splash-hidden' : ''}`}>
        <div className="splash-content">
          <img
            src="/Problemhub logo.png"
            alt="ProblemHub"
            className="splash-logo"
            width={80}
            height={80}
          />
          <span className="splash-brand">Problem<strong>Hub</strong></span>
        </div>
      </div>

      <main className={`app-shell ${pageReady ? 'app-ready' : 'app-loading'} ${isRefreshing ? 'app-refreshing' : ''}`}>
      {toastMessage && (
        <div className="share-toast" role="status">
          <Check style={{ width: 18, height: 18 }} /> {toastMessage}
        </div>
      )}

      <aside className="left-rail">
        <div className="left-rail-brand-row">
          <Logo onRefresh={refreshApp} />
          <div className="mobile-header-actions">
            <button
              type="button"
              className="mobile-share-btn"
              onClick={() => {
                if (!user) requireAuth('post')
                else setShowPostModal(true)
              }}
              title="Share a Problem"
              aria-label="Share a Problem"
            >
              <Pencil style={{ width: 14, height: 14 }} />
              <span>Share</span>
            </button>
            {user ? (
              <div className="mobile-user-wrap">
                <div className="account-circle-avatar mobile-avatar" title={user.email || 'User'}>
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
                <button
                  type="button"
                  className="mobile-logout-btn"
                  onClick={handleSignOut}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mobile-signin-btn"
                onClick={() => requireAuth('general', 'signin')}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
        {user ? (
          <div className="signed-in-rail">
            <div className="signed-in-intro slogan-text">
              Share Problems.<br />Discover Opportunities.<br /><span>Build a Better Tomorrow.</span>
            </div>
            <div className="prompt-list">
              {reflectionPrompts.map((prompt) => (
                <p key={prompt}>{prompt}</p>
              ))}
            </div>
            <p className="notice-share">Notice it. Describe it. Share it.</p>
            <button type="button" className="share-problem-button" onClick={() => setShowPostModal(true)}>
              <Pencil /> Share a Problem
            </button>

            <div className="left-rail-account">
              <div className="account-circle-avatar" title={user.email || 'User'}>
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="account-info">
                <span className="account-name">{user.email?.split('@')[0] || 'ProblemHub User'}</span>
                <span className="account-email">{user.email || ''}</span>
              </div>
              <button
                type="button"
                className="account-logout-btn"
                onClick={handleSignOut}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="intro">
              <h1 className="slogan-text">
                Share Problems.<br />Discover Opportunities.<br /><span>Build a Better Tomorrow.</span>
              </h1>
            </div>
            <div className="signup-stack">
              <button type="button" className="google-button" onClick={() => requireAuth('general', 'signup')}>
                <GoogleLogoSvg />
                <span>Sign up with Google</span>
              </button>
              <button type="button" className="email-button" onClick={() => requireAuth('general', 'signup')}>
                <MessageCircle /> Sign up with Email
              </button>
            </div>
            <p className="legal">
              By continuing, you agree to our <a href="#terms">User Agreement</a> and acknowledge that you understand the <a href="#privacy">Privacy Policy.</a>
            </p>
            <div className="rail-caption">
              <i />
              <p>Real problems.<br />Real people.<br />Better solutions.</p>
            </div>
          </>
        )}
      </aside>

      <section className="feed">
        <div className={`feed-sticky-header ${isScrolled ? 'is-scrolled' : ''} ${showHeader ? 'show' : 'hide'}`}>
          <div className="search-row">
            <label className="search-box">
              <Search />
              <input
                aria-label="Search problems"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search problems, categories, or keywords..."
              />
            </label>
            <button
              type="button"
              className="filter-button"
              aria-label="Toggle category filter bar"
              title="Filter by category"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal style={{ color: showFilters || selectedCategory !== 'All' ? '#087cff' : '#c4d0dd' }} />
            </button>
          </div>

          {showFilters && (
            <div className="category-filter-bar" role="toolbar" aria-label="Filter by category">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat)
                    setTabAnimKey((prev) => prev + 1)
                    const feedEl = document.querySelector('.feed') as HTMLElement | null
                    if (feedEl) {
                      feedEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
                    }
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <nav className="tabs" aria-label="Problem sorting tabs">
            <div className="tabs-list">
              {(['Latest', 'Top', 'Posts', 'Saved'] as const).map((tab) => (
                <button
                  type="button"
                  className={activeTab === tab ? 'active' : ''}
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="tab-add-post-btn"
              onClick={() => {
                if (!user) requireAuth('post')
                else setShowPostModal(true)
              }}
              aria-label="Add a new post"
            >
              <Plus />
              <span>Add Post</span>
            </button>
          </nav>
        </div>
        {posted && (
          <div className="posted-note">
            <Check /> Your problem was added to the community feed.
          </div>
        )}

        <div key={tabAnimKey} className="feed-posts-container">
          {filteredProblems.length ? (
            filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onToggleSave={handleToggleSave}
                onShare={handleShare}
                onAddComment={handleAddComment}
                onToggleLikeComment={handleToggleLikeComment}
                onToggleReaction={handleToggleReaction}
                onRequireAuth={requireAuth}
                user={user}
                isHighlighted={highlightedPostId === problem.id}
              />
            ))
          ) : (
            <div className="empty-state">
              {problems.length === 0 ? (
                <div className="empty-feed-card">
                  <div className="empty-feed-icon">💡</div>
                  <h3>No problems shared yet</h3>
                  <p>
                    Be the first to share a frustration, inefficiency, or pain point you face in your daily work. Discover opportunities and build solutions together.
                  </p>
                  <button
                    type="button"
                    className="empty-feed-btn"
                    onClick={() => {
                      if (!user) requireAuth('post')
                      else setShowPostModal(true)
                    }}
                  >
                    <Plus style={{ width: 16, height: 16 }} /> Share a Problem
                  </button>
                </div>
              ) : activeTab === 'Saved' ? (
                user ? (
                  'You have no saved problems yet. Click "Save" on any problem to bookmark it here.'
                ) : (
                  <div className="tab-signin-prompt">
                    <p>Sign in with Google or Email to view your saved problems.</p>
                    <button type="button" className="tab-signin-btn" onClick={() => requireAuth('save', 'signin')}>
                      Sign In to View Saved
                    </button>
                  </div>
                )
              ) : activeTab === 'Posts' ? (
                user ? (
                  'You haven\'t posted any problems or replies yet. Share a problem or comment on discussions to see them here.'
                ) : (
                  <div className="tab-signin-prompt">
                    <p>Sign in to view your posts and replies.</p>
                    <button type="button" className="tab-signin-btn" onClick={() => requireAuth('general', 'signin')}>
                      Sign In to View Posts
                    </button>
                  </div>
                )
              ) : (
                <div className="empty-search-state">
                  <p>No problems match “{query || selectedCategory}”.</p>
                  {(query || selectedCategory !== 'All') && (
                    <button
                      type="button"
                      className="clear-filters-btn"
                      onClick={() => {
                        setQuery('')
                        setSelectedCategory('All')
                      }}
                    >
                      Clear search & filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <aside className="right-rail">
        {!user && (
          <section className="ask-card">
            <h2>Have a problem?</h2>
            <p>
              Share a real problem you face in your work or professional life. The community can discuss it, and maybe someone will build a solution.
            </p>
            <button type="button" className="post-button" onClick={() => requireAuth('post')}>
              <Pencil /> Post a Problem
            </button>
          </section>
        )}

        <section className="sponsored-card">
          <div className="sponsored-head">
            <h3>Products</h3>
            <button
              type="button"
              onClick={() => {
                if (!user) requireAuth('product')
                else setShowAddProductModal(true)
              }}
            >
              <Plus /> Add Product
            </button>
          </div>

          {displayedProducts.length > 0 ? (
            <div className="sponsored-boxes-list">
              {displayedProducts.slice(0, 5).map((product, idx) => (
                <div
                  className={`product ${product.className} ${swappingSlot === idx ? 'is-swapping' : ''}`}
                  key={`${product.name}-${idx}`}
                  onClick={() => {
                    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer')
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Visit ${product.name}`}
                >
                  <div className={`product-mark ${product.className}`}>
                    {product.logoUrl ? (
                      <img
                        src={product.logoUrl}
                        alt={product.name}
                        className="product-mark-img"
                      />
                    ) : (
                      product.mark
                    )}
                  </div>
                  <div className="product-details">
                    <strong>{product.name}</strong>
                    <p>{product.description}</p>
                  </div>
                  <ExternalLink />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sponsored-box">
              <p>No products listed yet.</p>
              <button
                type="button"
                className="empty-sponsored-btn"
                onClick={() => {
                  if (!user) requireAuth('product')
                  else setShowAddProductModal(true)
                }}
              >
                <Plus style={{ width: 14, height: 14 }} /> Add Product
              </button>
            </div>
          )}
        </section>
      </aside>

      {showAuthModal && !user && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          intent={authIntent}
          initialMode={authInitialMode}
        />
      )}

      {showPostModal && user && (
        <PostProblemModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleSubmit}
          user={user}
        />
      )}

      {showAddProductModal && (
        <AddProductModal
          onClose={() => setShowAddProductModal(false)}
          user={user}
          onSuccess={(msg) => {
            setToastMessage(msg)
            setTimeout(() => setToastMessage(null), 5000)
          }}
        />
      )}
    </main>
    </>
  )
}
