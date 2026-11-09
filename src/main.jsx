
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingBasket, Search, LogIn, LogOut, Plus,
  Pencil, Trash2, X, Package, RefreshCw
} from 'lucide-react';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [admin, setAdmin] = useState(false);
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    stock: '0'
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabase) {
      setError('يرجى إعداد اتصال قاعدة البيانات أولاً.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [p, c] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name')
    ]);

    if (p.error) {
      setError('تعذر تحميل المنتجات: ' + p.error.message);
    } else {
      setProducts(p.data || []);
    }

    if (!c.error) setCategories(c.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
      });

      const { data: { subscription } } =
        supabase.auth.onAuthStateChange((_event, currentSession) => {
          setSession(currentSession);
        });

      return () => subscription.unsubscribe();
    }
  }, []);

  const visible = useMemo(() => products.filter(p =>
    (category === 'all' || String(p.category_id) === String(category)) &&
    (p.name || '').toLowerCase().includes(query.toLowerCase())
  ), [products, category, query]);

  async function login(e) {
    e.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('تعذر تسجيل الدخول: ' + error.message);
    } else {
      setShowLogin(false);
      setPassword('');
      setAdmin(true);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setAdmin(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: '',
      image_url: '',
      category_id: '',
      stock: '0'
    });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      image_url: p.image_url || '',
      category_id: p.category_id ?? '',
      stock: p.stock ?? 0
    });
    setShowForm(true);
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!supabase) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      image_url: form.image_url || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      stock: Number(form.stock || 0)
    };

    const result = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);

    if (result.error) {
      alert('لم يتم الحفظ: ' + result.error.message);
      return;
    }

    setShowForm(false);
    await load();
  }

  async function removeProduct(p) {
    if (!confirm(`هل تريد حذف المنتج «${p.name}»؟`)) return;

    const { error } = await supabase.from('products').delete().eq('id', p.id);

    if (error) {
      alert('تعذر الحذف: ' + error.message);
    } else {
      load();
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo"><ShoppingBasket /></div>
          <div>
            <h1>الجرادي للخضار والفواكه</h1>
            <small>طازج كل يوم… من سوقنا إلى بيتكم</small>
          </div>
        </div>

        <button className="adminBtn" onClick={() =>
          session ? setAdmin(!admin) : setShowLogin(true)
        }>
          <LogIn size={17} />
          {session ? 'لوحة التحكم' : 'دخول الإدارة'}
        </button>
      </header>

      <section className="hero">
        <div>
          <span className="tag">أهلاً بكم في متجرنا</span>
          <h2>خضار وفواكه طازجة<br />لأسرتكم كل يوم</h2>
          <p>تصفحوا المنتجات المتوفرة وتواصلوا معنا لطلب احتياجاتكم.</p>
          <a className="whatsapp"
            href="https://wa.me/967775391755"
            target="_blank"
            rel="noreferrer">
            اطلب عبر واتساب 775391755
          </a>
        </div>
        <div className="heroArt">🥬🍅🍊</div>
      </section>

      {admin && session && (
        <section className="adminPanel">
          <div className="panelHead">
            <div>
              <h2>لوحة إدارة المنتجات</h2>
              <small>إدارة المنتجات والأسعار والمخزون</small>
            </div>
            <div className="actions">
              <button className="outline" onClick={load}>
                <RefreshCw size={16} /> تحديث
              </button>
              <button className="primary" onClick={openNew}>
                <Plus size={17} /> إضافة منتج
              </button>
              <button className="outline" onClick={logout}>
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
          <p className="hint">تسجيل الإدارة يتم عبر حساب Supabase Auth.</p>
        </section>
      )}

      <main>
        <div className="sectionHead">
          <div>
            <h2>{admin ? 'إدارة المنتجات' : 'منتجاتنا'}</h2>
            <small>{products.length} منتج</small>
          </div>
          <div className="search">
            <Search size={18} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
            />
          </div>
        </div>

        <div className="filters">
          <button
            className={category === 'all' ? 'active' : ''}
            onClick={() => setCategory('all')}>
            الكل
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={String(category) === String(c.id) ? 'active' : ''}
              onClick={() => setCategory(String(c.id))}>
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty">جارٍ تحميل المنتجات…</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <Package size={34} />
            <p>لا توجد منتجات لعرضها حالياً.</p>
          </div>
        ) : (
          <div className="grid">
            {visible.map(p => (
              <article className="product" key={p.id}>
                <div className="photo">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} />
                    : <span>🥦</span>}

                  {admin && session && (
                    <div className="editActions">
                      <button onClick={() => openEdit(p)} aria-label="تعديل">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => removeProduct(p)} aria-label="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="productInfo">
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                  <div className="price">
                    {Number(p.price || 0).toLocaleString('ar')}
                    {' '}<small>ريال</small>
                  </div>
                  <small className="stock">المتوفر: {p.stock ?? '—'}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer>
        <strong>الجرادي للخضار والفواكه</strong>
        <p>حجة – مبنى نقابة السائقين، جوار محطة البنزين</p>
        <a href="https://wa.me/967775391755">واتساب: 775391755</a>
      </footer>

      {showLogin && (
        <div className="overlay">
          <form className="modal" onSubmit={login}>
            <button type="button" className="close"
              onClick={() => setShowLogin(false)}>
              <X />
            </button>
            <h2>دخول لوحة التحكم</h2>
            <label>
              البريد الإلكتروني
              <input type="email" required value={email}
                onChange={e => setEmail(e.target.value)} />
            </label>
            <label>
              كلمة المرور
              <input type="password" required value={password}
                onChange={e => setPassword(e.target.value)} />
            </label>
            <button className="primary full">تسجيل الدخول</button>
            <small>أنشئ حساب المدير من Authentication في Supabase قبل الاستخدام.</small>
          </form>
        </div>
      )}

      {showForm && (
        <div className="overlay">
          <form className="modal" onSubmit={saveProduct}>
            <button type="button" className="close"
              onClick={() => setShowForm(false)}>
              <X />
            </button>
            <h2>{editing ? 'تعديل المنتج' : 'إضافة منتج'}</h2>

            <label>
              اسم المنتج
              <input required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>

            <label>
              الوصف
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>

            <div className="two">
              <label>
                السعر
                <input required type="number" min="0" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })} />
              </label>
              <label>
                المخزون
                <input type="number" min="0" value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })} />
              </label>
            </div>

            <label>
              التصنيف
              <select value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">بدون تصنيف</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label>
              رابط الصورة
              <input value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..." />
            </label>

            <button className="primary full" disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ المنتج'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
    
