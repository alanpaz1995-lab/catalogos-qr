"use client";



import { useEffect, useState } from "react";



import { useParams } from "next/navigation";



import { supabase } from "@/lib/supabase";



import HeroCatalogo from "../components/HeroCatalogo";



import { Empresa } from "@/types/empresa";



import { Producto } from "@/types/producto";



import { ItemPedido } from "@/types/pedido";



import CheckoutModal from "../components/CheckoutModal";



type ClienteCatalogo = {



  cliente_id: number;



  nombre: string;



  telefono: string;



  email?: string;



  direccion?: string;



};







type PrecioLista = {



  lista_id: number;



  lista_nombre: string;



  producto_id: number;



  precio_minorista: number | null;



  precio_mayorista: number | null;



};



type ProductoLista = Producto & {



  precio: number;



  precio_mayorista: number | null;



};



function dinero(valor: number) {



  return new Intl.NumberFormat("es-AR", {



    style: "currency",



    currency: "ARS",



    maximumFractionDigits: 0,



  }).format(valor);



}



export default function CatalogoListaPage() {



  const params = useParams();



  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;



  const listaSlug = Array.isArray(params.listaSlug)



    ? params.listaSlug[0]



    : params.listaSlug;



  const [empresa, setEmpresa] = useState<Empresa | null>(null);



  const [nombreLista, setNombreLista] = useState("");
  const [permitirCarrito, setPermitirCarrito] = useState(false);



  const [productos, setProductos] = useState<ProductoLista[]>([]);



  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<string[]>([]);



  const [categoria, setCategoria] = useState("Todos");



  const [busqueda, setBusqueda] = useState("");



  const [cargando, setCargando] = useState(true);



  const [error, setError] = useState("");



  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);



  const [carrito, setCarrito] = useState<ItemPedido[]>([]);



  const [checkoutAbierto, setCheckoutAbierto] = useState(false);



  const [carritoAbierto, setCarritoAbierto] = useState(false);



  const [mensajeCarrito, setMensajeCarrito] = useState("");







  const [clienteRegistrado, setClienteRegistrado] = useState<ClienteCatalogo | null>(null);



  const [registroAbierto, setRegistroAbierto] = useState(false);



  const [nombreRegistro, setNombreRegistro] = useState("");



  const [telefonoRegistro, setTelefonoRegistro] = useState("");



  const [emailRegistro, setEmailRegistro] = useState("");



  const [direccionRegistro, setDireccionRegistro] = useState("");



  const [registrando, setRegistrando] = useState(false);



  const [errorRegistro, setErrorRegistro] = useState("");







  // El catálogo principal y todas las listas comparten la identidad por empresa.



  useEffect(() => {



    if (!empresa?.id) return;



    const clave = `comersys_cliente_${empresa.id}`;



    try {



      const guardado = localStorage.getItem(clave);



      const cliente = guardado ? JSON.parse(guardado) as ClienteCatalogo : null;



      if (cliente && Number(cliente.cliente_id) > 0 && cliente.nombre && cliente.telefono) {



        setClienteRegistrado(cliente);



        setRegistroAbierto(false);



      } else {



        setClienteRegistrado(null);



        setRegistroAbierto(true);



      }



    } catch {



      setClienteRegistrado(null);



      setRegistroAbierto(true);



    }



  }, [empresa?.id]);







  async function registrarCliente(event: React.FormEvent<HTMLFormElement>) {



    event.preventDefault();



    if (!empresa?.id || registrando) return;



    setErrorRegistro("");



    setRegistrando(true);



    try {



      const { data, error: errorRpc } = await supabase.rpc("registrar_cliente_catalogo", {



        p_empresa_id: empresa.id,



        p_nombre: nombreRegistro.trim(),



        p_telefono: telefonoRegistro.trim(),



        p_email: emailRegistro.trim(),



        p_direccion: direccionRegistro.trim(),



        p_observaciones: null,



      });



      if (errorRpc) throw errorRpc;



      const fila = Array.isArray(data) ? data[0] : data;



      if (!fila || !Number(fila.cliente_id)) {



        throw new Error("No se pudo confirmar el registro del cliente.");



      }



      const cliente: ClienteCatalogo = {



        cliente_id: Number(fila.cliente_id),



        nombre: String(fila.cliente_nombre || nombreRegistro.trim()),



        telefono: String(fila.cliente_telefono || telefonoRegistro.trim()),



        email: emailRegistro.trim(),



        direccion: direccionRegistro.trim(),



      };



      localStorage.setItem(`comersys_cliente_${empresa.id}`, JSON.stringify(cliente));



      setClienteRegistrado(cliente);



      setRegistroAbierto(false);



    } catch (e) {



      setErrorRegistro(e instanceof Error ? e.message : "No se pudo registrar el cliente.");



    } finally {



      setRegistrando(false);



    }



  }







  function cambiarCliente() {



    if (!empresa?.id) return;



    localStorage.removeItem(`comersys_cliente_${empresa.id}`);



    setClienteRegistrado(null);



    setNombreRegistro("");



    setTelefonoRegistro("");



    setEmailRegistro("");



    setDireccionRegistro("");



    setErrorRegistro("");



    setRegistroAbierto(true);



    setCheckoutAbierto(false);



  }







  useEffect(() => {



    let vigente = true;



    async function cargar() {



      setCargando(true);



      setError("");



      setEmpresa(null);
      setPermitirCarrito(false);



      setProductos([]);



      setCarrito([]);



      setCheckoutAbierto(false);



      setCarritoAbierto(false);



      if (!slug || !listaSlug) {



        setError("El enlace de esta lista no es válido.");



        setCargando(false);



        return;



      }



      try {



        // Esta función pública controla qué productos pertenecen a la lista.



        // Nunca se consulta lista_productos directamente desde el navegador.



        const { data: filas, error: errorLista } = await supabase.rpc(



          "obtener_lista_catalogo_publica",



          { p_empresa_slug: slug, p_lista_slug: listaSlug }



        );



        if (errorLista) throw errorLista;



        const precios = (filas || []) as PrecioLista[];



        // La función actual devuelve cero filas tanto para listas vacías



        // como para listas inexistentes: no inventamos precios en ese caso.



        if (precios.length === 0) {



          if (vigente) {



            setError("Esta lista no tiene productos disponibles por el momento.");



            setCargando(false);



          }



          return;



        }



        const { data: datosEmpresa, error: errorEmpresa } = await supabase



          .from("empresas")



          .select("*")



          .eq("slug", slug)



          .maybeSingle();



        if (errorEmpresa) throw errorEmpresa;



        if (



          !datosEmpresa ||



          datosEmpresa.estado !== "Activo" ||



          datosEmpresa.catalogo_activo === false



        ) {



          throw new Error("Este catálogo no se encuentra disponible.");



        }



        const ids = [...new Set(precios.map((fila) => Number(fila.producto_id)))];



        const [consultaProductos, consultaCategorias] = await Promise.all([



          supabase



            .from("productos")



            .select("*")



            .eq("empresa_id", datosEmpresa.id)



            .eq("estado", "Activo")



            .in("id", ids),



          supabase



            .from("categorias")



            .select("nombre, orden")



            .eq("empresa_id", datosEmpresa.id)



            .eq("estado", "Activo")



            .order("orden", { ascending: true })



            .order("nombre", { ascending: true }),



        ]);



        if (consultaProductos.error) throw consultaProductos.error;



        if (consultaCategorias.error) throw consultaCategorias.error;



        const porId = new Map(



          precios.map((fila) => [Number(fila.producto_id), fila])



        );



        const categorias = (consultaCategorias.data || []).map(



          (fila) => String(fila.nombre)



        );



        const orden = new Map(categorias.map((nombre, i) => [nombre, i]));



        const productosDeLista = ((consultaProductos.data || []) as Producto[])



          .filter((producto) => {



            const precio = porId.get(Number(producto.id));



            // No mostramos productos sin precio minorista definido.



            return (



              producto.visible_catalogo !== false &&



              precio != null &&



              precio.precio_minorista != null &&



              Number.isFinite(Number(precio.precio_minorista)) &&



              Number(precio.precio_minorista) >= 0



            );



          })



          .map((producto): ProductoLista => {



            const fila = porId.get(Number(producto.id))!;



            return {



              ...producto,



              precio: Number(fila.precio_minorista),



              // Sin mayorista específico se usa el minorista de esta lista.



              precio_mayorista:



                fila.precio_mayorista == null



                  ? null



                  : Number(fila.precio_mayorista),



            };



          })



          .sort((a, b) => {



            const posA = orden.get(a.categoria || "") ?? Number.MAX_SAFE_INTEGER;



            const posB = orden.get(b.categoria || "") ?? Number.MAX_SAFE_INTEGER;



            return posA - posB || Number(b.id) - Number(a.id);



          });



        if (!vigente) return;



        setEmpresa(datosEmpresa as Empresa);



        setNombreLista(precios[0].lista_nombre);
        const opciones = (datosEmpresa.carritos_catalogo || {}) as Record<string, boolean>;
        setPermitirCarrito(
          datosEmpresa.permitir_compras !== false && opciones[`lista_${Number(precios[0].lista_id)}`] !== false
        );



        setCategoriasOrdenadas(categorias);



        setProductos(productosDeLista);



      } catch (e) {



        if (vigente) {



          setError(



            e instanceof Error ? e.message : "No se pudo cargar esta lista."



          );



        }



      } finally {



        if (vigente) setCargando(false);



      }



    }



    void cargar();



    return () => {



      vigente = false;



    };



  }, [slug, listaSlug]);



  useEffect(() => {



    if (!imagenAmpliada) return;



    const cerrar = (evento: KeyboardEvent) => {



      if (evento.key === "Escape") setImagenAmpliada(null);



    };



    window.addEventListener("keydown", cerrar);



    return () => window.removeEventListener("keydown", cerrar);



  }, [imagenAmpliada]);



  function agregarAlCarrito(producto: ProductoLista) {
    if (!permitirCarrito) return;



    setMensajeCarrito("");



    setCarrito((actual) => {



      const existente = actual.find((item) => item.producto.id === producto.id);



      const cantidadActual = existente?.cantidad ?? 0;



      const stockLimitado = producto.controlar_stock !== false;



      const stock = Number(producto.stock ?? 0);



      if (stockLimitado && cantidadActual >= stock) {



        setMensajeCarrito("No hay más unidades disponibles de este producto.");



        return actual;



      }



      if (existente) {



        return actual.map((item) =>



          item.producto.id === producto.id



            ? { ...item, cantidad: item.cantidad + 1 }



            : item



        );



      }



      return [...actual, { producto, cantidad: 1 }];



    });



  }











  function cambiarCantidad(productoId: number, cambio: number) {



    setMensajeCarrito("");



    setCarrito((actual) => actual.flatMap((item) => {



      if (item.producto.id !== productoId) return [item];



      const cantidad = item.cantidad + cambio;



      if (cantidad <= 0) return [];



      const producto = item.producto;



      if (producto.controlar_stock !== false && cantidad > Number(producto.stock ?? 0)) {



        setMensajeCarrito("No hay más unidades disponibles de este producto.");



        return [item];



      }



      return [{ ...item, cantidad }];



    }));



  }











  function precioUnitario(item: ItemPedido) {



    const producto = item.producto;



    const minimo = Math.max(1, Number(producto.cantidad_minima_mayorista || 10));



    const mayorista = producto.precio_mayorista;



    return item.cantidad >= minimo && mayorista != null



      ? Number(mayorista)



      : Number(producto.precio);



  }











  const cantidadCarrito = carrito.reduce((suma, item) => suma + item.cantidad, 0);



  const totalCarrito = carrito.reduce(



    (suma, item) => suma + precioUnitario(item) * item.cantidad,



    0



  );











  const categoriasPresentes = new Set(



    productos.map((p) => p.categoria).filter((c): c is string => Boolean(c))



  );



  const categorias = [



    "Todos",



    ...categoriasOrdenadas.filter((c) => categoriasPresentes.has(c)),



    ...Array.from(categoriasPresentes).filter(



      (c): c is string => Boolean(c) && !categoriasOrdenadas.includes(c)



    ),



  ];



  const filtrados = productos.filter((producto) => {



    const texto = busqueda.trim().toLowerCase();



    const coincideTexto = [



      producto.nombre,



      producto.categoria,



      producto.descripcion,



    ].some((valor) => (valor || "").toLowerCase().includes(texto));



    return (



      coincideTexto &&



      (categoria === "Todos" || producto.categoria === categoria)



    );



  });



  if (cargando) {



    return (



      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">



        <p className="text-slate-600">Cargando lista de precios...</p>



      </main>



    );



  }



  if (error || !empresa) {



    return (



      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">



        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">



          <h1 className="text-2xl font-bold">Lista no disponible</h1>



          <p className="mt-3 text-slate-600">{error || "No se encontró la lista."}</p>



        </div>



      </main>



    );



  }



  const color = empresa.color_principal || "#2563EB";



  const secundario = empresa.color_secundario || "#F97316";



  const whatsapp = (empresa.whatsapp || "").replace(/\D/g, "");



  return (



    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">



      <HeroCatalogo empresa={empresa} />



      <div className="fixed left-6 top-6 z-50">



        {clienteRegistrado ? (



          <div className="rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-xl">



            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">



              ✓ Cliente registrado



            </p>



            <p className="mt-1 font-bold text-slate-800">



              {clienteRegistrado.nombre}



            </p>



            <button



              type="button"



              onClick={cambiarCliente}



              className="mt-1 text-xs font-semibold text-[#2563EB]"



            >



              No soy esta persona



            </button>



          </div>



        ) : (



          <button



            type="button"



            onClick={() => setRegistroAbierto(true)}



            className="rounded-full bg-white px-5 py-3 font-semibold text-[#2563EB] shadow-xl transition hover:scale-105"



          >



            👤 Nuevo cliente



          </button>



        )}



      </div>







      <section className="mx-auto max-w-7xl px-6 py-10">



        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

          <div>

            <h1 className="text-2xl font-bold">Nuestros productos</h1>

            <p className="mt-1 text-slate-500">Encontrá el producto que estás buscando.</p>

            <p className="mt-0.5 text-xs font-medium text-slate-600">{nombreLista}</p>

          </div>

          <input

            type="search"

            value={busqueda}

            onChange={(e) => setBusqueda(e.target.value)}

            placeholder="Buscar productos..."

            aria-label="Buscar productos"

            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none md:w-[438px] md:max-w-[45%]"

          />

        </div>

        <div className="mb-7 flex flex-col gap-4">

          <div className="flex flex-wrap gap-2">



            {categorias.map((nombre) => (



              <button



                key={nombre}



                type="button"



                onClick={() => setCategoria(nombre)}



                className={`rounded-full px-4 py-2 text-sm font-semibold ${



                  categoria === nombre ? "text-white" : "bg-slate-200 text-slate-700"



                }`}



                style={categoria === nombre ? { backgroundColor: color } : undefined}



              >



                {nombre}



              </button>



            ))}



          </div>



        </div>



        {filtrados.length === 0 ? (



          <div className="rounded-2xl bg-white p-10 text-center text-slate-600">



            No se encontraron productos.



          </div>



        ) : (



          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">



            {filtrados.map((producto) => {



              const minimo = Math.max(



                1,



                Number(producto.cantidad_minima_mayorista || 10)



              );



              const disponible =



                producto.controlar_stock === false ||



                producto.stock == null ||



                Number(producto.stock) > 0;



              const texto = encodeURIComponent(



                `Hola, quiero consultar por ${producto.nombre} de la lista ${nombreLista}.`



              );



              const enlace = whatsapp



                ? `https\://wa.me/${whatsapp}?text=${texto}`



                : `https\://wa.me/?text=${texto}`;



              return (



                <article



                  key={producto.id}



                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"



                >



                  {producto.imaguen ? (



                    <button



                      type="button"



                      onClick={() => setImagenAmpliada(producto.imaguen || null)}



                      className="h-56 w-full overflow-hidden bg-slate-100"



                      aria-label={`Ampliar imagen de ${producto.nombre}`}



                    >



                      <img



                        src={producto.imaguen}



                        alt={producto.nombre}



                        className="h-full w-full object-cover"



                      />



                    </button>



                  ) : (



                    <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-400">



                      Sin imagen



                    </div>



                  )}



                  <div className="flex flex-1 flex-col p-5">



                    <p className="text-sm font-semibold" style={{ color }}>



                      {producto.categoria || "Sin categoría"}



                    </p>



                    <h2 className="mt-2 text-xl font-bold">{producto.nombre}</h2>



                    {producto.descripcion && (



                      <p className="mt-2 text-sm text-slate-500">



                        {producto.descripcion}



                      </p>



                    )}



                    <div className="mt-auto pt-5">



                      {empresa.mostrar_precios !== false && (



                        <>



                          <p className="text-xs font-semibold uppercase text-slate-400">



                            Precio minorista



                          </p>



                          <p className="mt-1 text-2xl font-bold">



                            {dinero(producto.precio)}



                          </p>



                          {producto.precio_mayorista != null && (



                            <div className="mt-3 rounded-xl bg-emerald-50 p-3">



                              <p className="text-xs font-semibold text-emerald-700">



                                Precio mayorista



                              </p>



                              <p className="mt-1 text-xl font-bold text-emerald-700">



                                {dinero(producto.precio_mayorista)}



                              </p>



                              <p className="mt-1 text-xs text-emerald-700">



                                Desde {minimo} unidades



                              </p>



                            </div>



                          )}



                        </>



                      )}



                      <p className={`mt-4 text-sm font-semibold ${



                        disponible ? "text-emerald-700" : "text-slate-500"



                      }`}>



                        {disponible ? "Disponible" : "No disponible"}



                      </p>



                      {permitirCarrito && <button



                        type="button"



                        disabled={!disponible}



                        onClick={() => agregarAlCarrito(producto)}



                        className="mt-4 w-full rounded-xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"



                        style={{ backgroundColor: color }}



                      >



                        Agregar al carrito



                      </button>}



                      <a



                        href={enlace}



                        target="_blank"



                        rel="noreferrer"



                        className="mt-4 block rounded-xl px-4 py-3 text-center font-semibold text-white"



                        style={{ backgroundColor: secundario }}



                      >



                        Consultar por WhatsApp



                      </a>



                    </div>



                  </div>



                </article>



              );



            })}



          </div>



        )}



      </section>



      {permitirCarrito && carritoAbierto && (



        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4">



          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">



            <div className="flex items-center justify-between gap-3">



              <h2 className="text-2xl font-bold">Tu carrito</h2>



              <button type="button" onClick={() => setCarritoAbierto(false)} className="rounded-lg bg-slate-100 px-3 py-2">Cerrar ✕</button>



            </div>



            {carrito.length === 0 ? (



              <p className="mt-6 text-slate-600">Todavía no agregaste productos.</p>



            ) : (



              <div className="mt-5 space-y-4">



                {carrito.map((item) => (



                  <div key={item.producto.id} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">



                    <div className="min-w-0 flex-1">



                      <p className="font-semibold">{item.producto.nombre}</p>



                      <p className="text-sm text-slate-600">{dinero(precioUnitario(item))} por unidad</p>



                      <p className="font-bold">{dinero(precioUnitario(item) * item.cantidad)}</p>



                    </div>



                    <div className="flex items-center gap-3">



                      <button type="button" onClick={() => cambiarCantidad(item.producto.id, -1)} className="rounded-lg bg-slate-100 px-3 py-2" aria-label="Quitar una unidad">−</button>



                      <span className="font-semibold">{item.cantidad}</span>



                      <button type="button" onClick={() => cambiarCantidad(item.producto.id, 1)} className="rounded-lg bg-slate-100 px-3 py-2" aria-label="Agregar una unidad">+</button>



                    </div>



                  </div>



                ))}



                {mensajeCarrito && <p className="text-sm text-red-700">{mensajeCarrito}</p>}



                <div className="flex justify-between text-xl font-bold"><span>Total estimado</span><span>{dinero(totalCarrito)}</span></div>



                <p className="text-xs text-slate-500">Los precios y la disponibilidad se verifican nuevamente al confirmar el pedido.</p>



                <button



                  type="button"



                  onClick={() => { setCarritoAbierto(false); if (clienteRegistrado) setCheckoutAbierto(true); else setRegistroAbierto(true); }}



                  className="w-full rounded-xl px-5 py-4 font-semibold text-white"



                  style={{ backgroundColor: color }}



                >



                  Finalizar pedido



                </button>



              </div>



            )}



          </div>



        </div>



      )}











      {registroAbierto && (



        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4">



          <div role="dialog" aria-modal="true" aria-label="Registro de cliente" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">



            <h2 className="text-2xl font-bold">Bienvenido a {empresa.nombre}</h2>



            <p className="mt-2 text-sm text-slate-600">Registrate una sola vez para consultar las listas y hacer pedidos. No necesitás comprar ahora.</p>



            <form onSubmit={registrarCliente} className="mt-5 space-y-4">



              <label className="block text-sm font-semibold">Nombre y apellido



                <input required value={nombreRegistro} onChange={(e) => setNombreRegistro(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" autoComplete="name" />



              </label>



              <label className="block text-sm font-semibold">Teléfono



                <input required type="tel" value={telefonoRegistro} onChange={(e) => setTelefonoRegistro(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" autoComplete="tel" />



              </label>



              <label className="block text-sm font-semibold">Email (opcional)



                <input type="email" value={emailRegistro} onChange={(e) => setEmailRegistro(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" autoComplete="email" />



              </label>



              <label className="block text-sm font-semibold">Dirección (opcional)



                <input value={direccionRegistro} onChange={(e) => setDireccionRegistro(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" autoComplete="street-address" />



              </label>



              {errorRegistro && <p role="alert" className="text-sm text-red-700">{errorRegistro}</p>}



              <button type="submit" disabled={registrando} className="w-full rounded-xl bg-blue-600 p-4 font-semibold text-white disabled:opacity-60">



                {registrando ? "Registrando..." : "Registrarme y ver la lista"}



              </button>



            </form>



          </div>



        </div>



      )}







      <CheckoutModal



        abierto={checkoutAbierto && permitirCarrito}



        empresa={empresa}



        listaSlug={listaSlug}



        clienteRegistrado={clienteRegistrado}



        items={carrito}



        total={totalCarrito}



        formatearPrecio={dinero}



        onCerrar={() => setCheckoutAbierto(false)}



        onPedidoCreado={() => {



          setCarrito([]);



          setCarritoAbierto(false);



        }}



      />











      {imagenAmpliada && (



        <div



          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-5"



          onClick={() => setImagenAmpliada(null)}



          role="dialog"



          aria-modal="true"



          aria-label="Imagen del producto"



        >



          <button



            type="button"



            onClick={() => setImagenAmpliada(null)}



            className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 font-bold"



          >



            Cerrar ✕



          </button>



          <img



            src={imagenAmpliada}



            alt="Producto ampliado"



            className="max-h-[85vh] max-w-[95vw] object-contain"



          />



        </div>



      )}



      {permitirCarrito && cantidadCarrito > 0 && !carritoAbierto && !checkoutAbierto && (



        <button



          type="button"



          onClick={() => setCarritoAbierto(true)}



          className="fixed bottom-5 right-5 z-40 rounded-full px-5 py-4 font-bold text-white shadow-xl"



          style={{ backgroundColor: color }}



        >



          Carrito ({cantidadCarrito}) · {dinero(totalCarrito)}



        </button>



      )}











      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">



        Catálogo creado con ComerSys



      </footer>



    </main>



  );



}
