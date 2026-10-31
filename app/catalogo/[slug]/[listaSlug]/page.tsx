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
  codigo?: string | null;



  precio: number;



  precio_mayorista: number | null;



};

type MultimediaProducto = {
  id: number;
  producto_id: number;
  tipo: string;
  url: string;
  es_principal: boolean;
  activo: boolean;
  orden: number;
};

type ElementoGaleria = {
  src: string;
  alt: string;
  esVideo: boolean;
};

type VisorGaleria = {
  elementos: ElementoGaleria[];
  indice: number;
  nombreProducto: string;
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
  // Solo el dueño autenticado puede habilitar el tema oscuro de su vista de catálogo.
  const [vistaAdminAutorizada, setVistaAdminAutorizada] = useState(false);
  const [modoOscuroAdmin, setModoOscuroAdmin] = useState(false);

  useEffect(() => {
    if (!empresa?.id) return;
    if (new URLSearchParams(window.location.search).get("vista") !== "administrador") {
      setVistaAdminAutorizada(false);
      return;
    }
    let vigente = true;
    async function comprobarAdministrador() {
      setVistaAdminAutorizada(false);
      const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
      if (errorSesion || !user) return;
      const { data: empresaPropia, error: errorEmpresa } = await supabase
        .from("empresas")
        .select("id")
        .eq("id", empresa!.id)
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!vigente || errorEmpresa || !empresaPropia) return;
      const preferencia = window.localStorage.getItem("comersys-catalogo-modo-oscuro");
      setModoOscuroAdmin(preferencia === null
        ? window.localStorage.getItem("comersys-modo-oscuro") === "true"
        : preferencia === "true");
      setVistaAdminAutorizada(true);
    }
    void comprobarAdministrador();
    return () => { vigente = false; };
  }, [empresa?.id]);

  const catalogoOscuro = vistaAdminAutorizada && modoOscuroAdmin;

  function alternarModoCatalogo() {
    if (!vistaAdminAutorizada) return;
    const siguiente = !modoOscuroAdmin;
    setModoOscuroAdmin(siguiente);
    window.localStorage.setItem("comersys-catalogo-modo-oscuro", String(siguiente));
  }





  const [nombreLista, setNombreLista] = useState("");
  const [permitirCarrito, setPermitirCarrito] = useState(false);



  const [productos, setProductos] = useState<ProductoLista[]>([]);
  const [multimediaPorProducto, setMultimediaPorProducto] = useState<Record<number, MultimediaProducto[]>>({});



  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<string[]>([]);



  const [categoria, setCategoria] = useState("Todos");



  const [busqueda, setBusqueda] = useState("");



  const [cargando, setCargando] = useState(true);



  const [error, setError] = useState("");



  const [imagenAmpliada, setImagenAmpliada] = useState<VisorGaleria | null>(null);



  const [carrito, setCarrito] = useState<ItemPedido[]>([]);



  const [checkoutAbierto, setCheckoutAbierto] = useState(false);



  const [carritoAbierto, setCarritoAbierto] = useState(false);



  const [mensajeCarrito, setMensajeCarrito] = useState("");

  // Lista de cálculo informativo, independiente de los pedidos.
  const [calculo, setCalculo] = useState<ItemPedido[]>([]);
  const [calculoAbierto, setCalculoAbierto] = useState(false);
  const [calculoIniciado, setCalculoIniciado] = useState(false);
  const [calculoClaveCargada, setCalculoClaveCargada] = useState("");
  const [mensajeCalculo, setMensajeCalculo] = useState("");







  const [clienteRegistrado, setClienteRegistrado] = useState<ClienteCatalogo | null>(null);



  const [registroAbierto, setRegistroAbierto] = useState(false);



  const [nombreRegistro, setNombreRegistro] = useState("");



  const [telefonoRegistro, setTelefonoRegistro] = useState("");



  const [emailRegistro, setEmailRegistro] = useState("");



  const [direccionRegistro, setDireccionRegistro] = useState("");



  const [registrando, setRegistrando] = useState(false);



  const [errorRegistro, setErrorRegistro] = useState("");







  // El catálogo principal y todas las listas comparten la identidad por empresa.
  // El registro solo se abre por una acción del visitante, no al entrar a la lista.



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



        setRegistroAbierto(false);



      }



    } catch {



      setClienteRegistrado(null);



      setRegistroAbierto(false);



    }



  }, [empresa?.id]);







  useEffect(() => {
    if (!empresa?.id || !listaSlug || cargando) return;
    try {
      const clave = `comersys_calculo_${empresa.id}_lista_${listaSlug}`;
      const guardado = window.localStorage.getItem(clave);
      const registros = guardado ? JSON.parse(guardado) as Array<{ id: number; cantidad: number }> : [];
      const recuperados = Array.isArray(registros) ? registros.flatMap((registro) => {
        const producto = productos.find((p) => p.id === Number(registro.id));
        const cantidad = Math.floor(Number(registro.cantidad));
        return producto && Number.isFinite(cantidad) && cantidad > 0
          ? [{ producto, cantidad }] : [];
      }) : [];
      setCalculo(recuperados);
      setCalculoIniciado(recuperados.length > 0);
    } catch (error) {
      console.warn("No se pudo recuperar el cálculo de la lista:", error);
    } finally {
      setCalculoClaveCargada(`comersys_calculo_${empresa.id}_lista_${listaSlug}`);
    }
  }, [empresa?.id, listaSlug, cargando]);

  useEffect(() => {
    if (!empresa?.id || !listaSlug || calculoClaveCargada !== `comersys_calculo_${empresa.id}_lista_${listaSlug}`) return;
    window.localStorage.setItem(
      `comersys_calculo_${empresa.id}_lista_${listaSlug}`,
      JSON.stringify(calculo.map((item) => ({ id: item.producto.id, cantidad: item.cantidad })))
    );
  }, [empresa?.id, listaSlug, calculo, calculoClaveCargada]);

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
      setMultimediaPorProducto({});
      setImagenAmpliada(null);



      setCarrito([]);
      setCalculoClaveCargada("");
      setCalculo([]);
      setCalculoAbierto(false);
      setCalculoIniciado(false);

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

        // Los videos y fotografías pertenecen a los productos ya autorizados por la lista.
        const idsVisibles = productosDeLista.map((producto) => producto.id);
        const agrupada: Record<number, MultimediaProducto[]> = {};
        if (idsVisibles.length > 0) {
          const { data: multimediaData, error: multimediaError } = await supabase
            .from("producto_multimedia")
            .select("id, producto_id, tipo, url, es_principal, activo, orden")
            .eq("empresa_id", datosEmpresa.id)
            .eq("activo", true)
            .in("producto_id", idsVisibles)
            .order("orden", { ascending: true });

          if (multimediaError) {
            console.warn("No se pudo cargar multimedia de la lista:", multimediaError);
          } else {
            for (const item of (multimediaData || []) as MultimediaProducto[]) {
              if (!item.url) continue;
              const idProducto = Number(item.producto_id);
              if (!agrupada[idProducto]) agrupada[idProducto] = [];
              agrupada[idProducto].push(item);
            }
          }
        }
        if (!vigente) return;
        setMultimediaPorProducto(agrupada);
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

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setImagenAmpliada(null);
      if (evento.key === "ArrowRight" || evento.key === "ArrowLeft") {
        const direccion = evento.key === "ArrowRight" ? 1 : -1;
        setImagenAmpliada((actual) => {
          if (!actual || actual.elementos.length <= 1) return actual;
          return {
            ...actual,
            indice: (actual.indice + direccion + actual.elementos.length) % actual.elementos.length,
          };
        });
      }
    };
    window.addEventListener("keydown", manejarTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", manejarTeclado);
    };
  }, [imagenAmpliada !== null]);

  function obtenerGaleriaProducto(producto: ProductoLista): ElementoGaleria[] {
    const elementos: ElementoGaleria[] = [];
    const urls = new Set<string>();
    const agregar = (urlOriginal: string | null | undefined, esVideo: boolean) => {
      const url = urlOriginal?.trim();
      if (!url || urls.has(url)) return;
      urls.add(url);
      elementos.push({ src: url, alt: producto.nombre, esVideo });
    };

    agregar(producto.imaguen, false);
    const adicionales = [...(multimediaPorProducto[producto.id] || [])].sort((a, b) => {
      if (a.es_principal !== b.es_principal) return a.es_principal ? -1 : 1;
      return (a.orden ?? 0) - (b.orden ?? 0);
    });
    adicionales.forEach((item) => agregar(item.url, item.tipo === "Video"));
    return elementos;
  }

  function abrirGaleriaProducto(producto: ProductoLista) {
    const elementos = obtenerGaleriaProducto(producto);
    if (elementos.length === 0) return;
    setImagenAmpliada({ elementos, indice: 0, nombreProducto: producto.nombre });
  }

  function cambiarElementoGaleria(direccion: -1 | 1) {
    setImagenAmpliada((actual) => {
      if (!actual || actual.elementos.length <= 1) return actual;
      return {
        ...actual,
        indice: (actual.indice + direccion + actual.elementos.length) % actual.elementos.length,
      };
    });
  }



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











  function precioAplicado(producto: ProductoLista, cantidad: number) {
    const minimoConfigurado = Number(producto.cantidad_minima_mayorista ?? 10);
    const minimo = Number.isFinite(minimoConfigurado) && minimoConfigurado > 0
      ? minimoConfigurado : 10;
    return cantidad >= minimo && producto.precio_mayorista != null
      ? Number(producto.precio_mayorista) : Number(producto.precio);
  }

  function agregarAlCalculo(producto: ProductoLista) {
    if (empresa?.mostrar_precios === false) return;
    setCalculoIniciado(true);
    setMensajeCalculo("");
    setCalculo((actual) => {
      const existente = actual.find((item) => item.producto.id === producto.id);
      return existente
        ? actual.map((item) => item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 } : item)
        : [...actual, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidadCalculo(id: number, cambio: number) {
    setCalculo((actual) => actual.map((item) => item.producto.id === id
      ? { ...item, cantidad: Math.max(0, item.cantidad + cambio) } : item
    ).filter((item) => item.cantidad > 0));
  }

  function quitarDelCalculo(id: number) {
    setCalculo((actual) => actual.filter((item) => item.producto.id !== id));
  }

  function imprimirCalculo() {
    if (!empresa || calculo.length === 0) return;
    const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
    );
    const filas = calculo.map(({ producto, cantidad }) => {
      const p = producto as ProductoLista;
      const unitario = precioAplicado(p, cantidad);
      return `<tr><td>${escapar(p.codigo)}</td><td>${escapar(p.nombre)}</td><td class="num">${cantidad}</td><td class="num">${escapar(dinero(unitario))}</td><td class="num">${escapar(dinero(unitario * cantidad))}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Mi cálculo de compra</title>
    <style>body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}
    h1{font-size:23px;margin:6px 0}h2{font-size:17px;margin:0}.muted{color:#64748b}
    .cabecera{border-bottom:2px solid #334155;padding-bottom:18px;margin-bottom:22px}
    table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:10px 7px;border-bottom:1px solid #cbd5e1;text-align:left;vertical-align:top}
    th{background:#f1f5f9}.num{text-align:right;white-space:nowrap}.total{font-size:21px;text-align:right;margin-top:22px;font-weight:700}
    .nota{margin-top:24px;color:#64748b;font-size:11px}@page{size:A4;margin:14mm}@media print{body{padding:0}}</style>
    </head><body><div class="cabecera"><h2>${escapar(empresa.nombre)}</h2><h1>Mi cálculo de compra</h1>
    <div class="muted">Fecha: ${new Date().toLocaleDateString("es-AR")} · Documento informativo</div>
    ${clienteRegistrado ? `<div>Cliente: ${escapar(clienteRegistrado.nombre)} · Tel.: ${escapar(clienteRegistrado.telefono)}</div>` : ""}
    </div><table><thead><tr><th>Código</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Precio unitario</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${filas}</tbody></table><div class="total">Total estimado: ${escapar(dinero(totalCalculo))}</div>
    <p class="nota">Cálculo informativo. No constituye un pedido confirmado. Los precios están sujetos a actualización.</p></body></html>`;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setMensajeCalculo("El navegador bloqueó la ventana. Permití ventanas emergentes para guardar el PDF.");
      return;
    }
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.setTimeout(() => ventana.print(), 450);
  }

  function precioUnitario(item: ItemPedido) {



    const producto = item.producto;



    const minimo = Math.max(1, Number(producto.cantidad_minima_mayorista || 10));



    const mayorista = producto.precio_mayorista;



    return item.cantidad >= minimo && mayorista != null



      ? Number(mayorista)



      : Number(producto.precio);



  }











  const cantidadCalculo = calculo.reduce((suma, item) => suma + item.cantidad, 0);
  const totalCalculo = calculo.reduce((suma, item) =>
    suma + precioAplicado(item.producto as ProductoLista, item.cantidad) * item.cantidad, 0);

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
      producto.codigo,



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



    <main className={catalogoOscuro
      ? "comersys-catalogo-admin-oscuro min-h-screen bg-black text-neutral-100"
      : "min-h-screen bg-[#F8FAFC] text-[#1E293B]"}>
      {vistaAdminAutorizada && (
        <div className="fixed right-4 top-4 z-[75] flex items-center gap-2 rounded-2xl border border-neutral-600 bg-[#171717] p-2 text-white shadow-2xl">
          <span className="hidden px-2 text-xs font-bold sm:inline">Vista del administrador</span>
          <button type="button" onClick={alternarModoCatalogo}
            aria-label={modoOscuroAdmin ? "Activar modo claro del catálogo" : "Activar modo oscuro del catálogo"}
            className="rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
            {modoOscuroAdmin ? "☀️ Modo claro" : "🌙 Modo oscuro"}
          </button>
        </div>
      )}
      <style>{`
        .comersys-catalogo-admin-oscuro .bg-white { background-color: #171717 !important; }
        .comersys-catalogo-admin-oscuro .bg-slate-50,
        .comersys-catalogo-admin-oscuro .bg-slate-100,
        .comersys-catalogo-admin-oscuro .bg-slate-200 { background-color: #262626 !important; }
        .comersys-catalogo-admin-oscuro .border-slate-200,
        .comersys-catalogo-admin-oscuro .border-slate-300 { border-color: #404040 !important; }
        .comersys-catalogo-admin-oscuro .text-slate-400,
        .comersys-catalogo-admin-oscuro .text-slate-500,
        .comersys-catalogo-admin-oscuro .text-slate-600 { color: #bdbdbd !important; }
        .comersys-catalogo-admin-oscuro .text-slate-700,
        .comersys-catalogo-admin-oscuro .text-slate-800 { color: #ececec !important; }
        .comersys-catalogo-admin-oscuro input,
        .comersys-catalogo-admin-oscuro textarea,
        .comersys-catalogo-admin-oscuro select { background-color: #262626; color: #f5f5f5; border-color: #525252; }
        .comersys-catalogo-admin-oscuro input::placeholder { color: #a3a3a3; }
        .comersys-catalogo-admin-oscuro .bg-emerald-50 { background-color: #103c2a !important; }
        .comersys-catalogo-admin-oscuro .text-emerald-700 { color: #8ce9b3 !important; }
        .comersys-catalogo-admin-oscuro .bg-green-100 { background-color: #14532d !important; }
        .comersys-catalogo-admin-oscuro .text-green-700 { color: #bbf7d0 !important; }
      `}</style>



      <HeroCatalogo empresa={empresa} modoOscuro={catalogoOscuro} />



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



                <article key={producto.id}
                  className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex w-full flex-col">
                    {producto.imaguen ? (
                      <button type="button" onClick={() => abrirGaleriaProducto(producto)}
                        className="group relative block h-48 w-full cursor-zoom-in overflow-hidden bg-slate-100 text-left"
                        aria-label={`Ampliar imagen de ${producto.nombre}`}>
                        <img src={producto.imaguen} alt={producto.nombre}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                          🔍 Ver completa
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">Sin imagen</div>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <div>
                        <p className="text-xs font-semibold" style={{ color }}>{producto.categoria || "Sin categoría"}</p>
                        <h2 className="mt-1.5 text-lg font-bold leading-snug">{producto.nombre}</h2>
                        <div className="mt-1.5 min-h-[1.5rem]">
                          {producto.descripcion && (
                            <p className="line-clamp-2 text-xs leading-5 text-slate-500">{producto.descripcion}</p>
                          )}
                        </div>
                        <div className="mt-1 min-h-[1.25rem]">
                          {producto.codigo?.trim() && (
                            <p className="text-xs font-medium text-slate-600">Código: <span className="font-semibold break-all">{producto.codigo}</span></p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        {empresa.mostrar_precios !== false && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {producto.precio_mayorista != null ? "Precio minorista" : "Precio"}
                            </p>
                            <p className="mt-0.5 text-xl font-bold">{dinero(producto.precio)}</p>
                            {producto.precio_mayorista != null && (
                              <div className="mt-2.5 rounded-lg bg-emerald-50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Precio mayorista</p>
                                <p className="mt-0.5 text-lg font-bold text-emerald-700">{dinero(producto.precio_mayorista)}</p>
                                <p className="mt-0.5 text-[11px] font-medium text-emerald-700">Desde {minimo} unidades de este producto</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="mt-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${disponible
                            ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                            {disponible ? "Disponible" : "No disponible"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3.5 flex flex-1 flex-col justify-end space-y-2">
                        {empresa.mostrar_precios !== false && (
                          <button type="button" onClick={() => agregarAlCalculo(producto)}
                            className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-[13px] font-bold text-white transition hover:bg-emerald-800">
                            🧮 {calculoIniciado ? "Agregar al cálculo" : "Calcular mi compra"}
                          </button>
                        )}
                        {permitirCarrito && (
                          <button type="button" disabled={!disponible} onClick={() => agregarAlCarrito(producto)}
                            className="w-full rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: color }}>
                            🛒 Agregar al carrito
                          </button>
                        )}
                        <a href={enlace} target="_blank" rel="noreferrer"
                          className="block w-full rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold text-white transition hover:brightness-95"
                          style={{ backgroundColor: secundario }}>Consultar por WhatsApp</a>
                      </div>
                    </div>
                  </div>
                </article>



              );



            })}



          </div>



        )}



      </section>



      {empresa.mostrar_precios !== false && cantidadCalculo > 0 && !calculoAbierto && (
        <button type="button" onClick={() => setCalculoAbierto(true)}
          className="fixed bottom-20 right-5 z-40 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-xl">
          🧮 Mi cálculo ({cantidadCalculo}) · {dinero(totalCalculo)}
        </button>
      )}

      {empresa.mostrar_precios !== false && calculoAbierto && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div role="dialog" aria-modal="true" aria-label="Mi cálculo de compra"
            className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white p-5 text-slate-800 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div><h2 className="text-xl font-bold">Mi cálculo de compra</h2>
                <p className="text-xs text-slate-500">Sin compromiso de compra ni generación de pedidos</p></div>
              <button type="button" onClick={() => setCalculoAbierto(false)}
                className="rounded-lg bg-slate-100 px-3 py-2 font-semibold">Cerrar ✕</button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {calculo.length === 0 ? <p className="py-8 text-center text-slate-500">El cálculo está vacío. Agregá productos de esta lista.</p> :
                calculo.map(({ producto, cantidad }) => {
                  const p = producto as ProductoLista;
                  const precio = precioAplicado(p, cantidad);
                  const minimo = Math.max(1, Number(p.cantidad_minima_mayorista || 10));
                  const mayorista = p.precio_mayorista != null && cantidad >= minimo;
                  return <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex justify-between gap-3"><div className="min-w-0">
                      <p className="font-bold">{p.nombre}</p>
                      {p.codigo && <p className="text-xs text-slate-500">Código: {p.codigo}</p>}
                      <p className="mt-1 text-sm">{dinero(precio)} por unidad {p.precio_mayorista != null ? `· ${mayorista ? "Mayorista" : "Minorista"}` : ""}</p>
                      {!mayorista && p.precio_mayorista != null && <p className="text-xs text-emerald-700">Mayorista desde {minimo} unidades</p>}
                    </div><p className="shrink-0 font-bold">{dinero(precio * cantidad)}</p></div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-2 py-1">
                        <button type="button" onClick={() => cambiarCantidadCalculo(p.id, -1)} className="px-2 py-1 font-bold" aria-label="Disminuir cantidad">−</button>
                        <span className="min-w-6 text-center font-semibold">{cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidadCalculo(p.id, 1)} className="px-2 py-1 font-bold" aria-label="Aumentar cantidad">+</button>
                      </div>
                      <button type="button" onClick={() => quitarDelCalculo(p.id)} className="text-sm font-semibold text-red-600">Eliminar</button>
                    </div>
                  </div>;
                })}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-lg font-bold"><span>Total estimado</span><span>{dinero(totalCalculo)}</span></div>
              <p className="mt-1 text-xs text-slate-500">{cantidadCalculo} unidades · Los precios pueden cambiar.</p>
              {mensajeCalculo && <p className="mt-2 text-sm text-red-600">{mensajeCalculo}</p>}
              <button type="button" onClick={imprimirCalculo} disabled={calculo.length === 0}
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">📄 Descargar cálculo en PDF</button>
              <p className="mt-1 text-center text-xs text-slate-500">En la ventana de impresión elegí «Guardar como PDF».</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setCalculo([])} disabled={calculo.length === 0}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40">Vaciar cálculo</button>
                <button type="button" onClick={() => setCalculoAbierto(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold">Seguir viendo productos</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-6"
          onClick={() => setImagenAmpliada(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${imagenAmpliada.nombreProducto}`}
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            className="absolute right-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-800 shadow-xl"
            aria-label="Cerrar galería"
          >
            ✕
          </button>

          <div
            className="flex h-full w-full flex-col items-center justify-center gap-4"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
              {imagenAmpliada.elementos.length > 1 && (
                <button
                  type="button"
                  onClick={() => cambiarElementoGaleria(-1)}
                  className="absolute left-1 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-3xl font-black text-slate-900 shadow-xl sm:left-4 sm:h-14 sm:w-14"
                  aria-label="Elemento anterior"
                >
                  ‹
                </button>
              )}

              {imagenAmpliada.elementos[imagenAmpliada.indice].esVideo ? (
                <video
                  key={imagenAmpliada.elementos[imagenAmpliada.indice].src}
                  src={imagenAmpliada.elementos[imagenAmpliada.indice].src}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[78vh] max-w-[94vw] object-contain sm:max-w-[88vw]"
                  aria-label={`Video de ${imagenAmpliada.nombreProducto}`}
                >
                  Tu navegador no puede reproducir este video.
                </video>
              ) : (
                <img
                  src={imagenAmpliada.elementos[imagenAmpliada.indice].src}
                  alt={imagenAmpliada.elementos[imagenAmpliada.indice].alt}
                  className="max-h-[78vh] max-w-[94vw] object-contain sm:max-w-[88vw]"
                />
              )}

              {imagenAmpliada.elementos.length > 1 && (
                <button
                  type="button"
                  onClick={() => cambiarElementoGaleria(1)}
                  className="absolute right-1 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-3xl font-black text-slate-900 shadow-xl sm:right-4 sm:h-14 sm:w-14"
                  aria-label="Elemento siguiente"
                >
                  ›
                </button>
              )}
            </div>

            {imagenAmpliada.elementos.length > 1 && (
              <div className="flex w-full max-w-3xl flex-col items-center gap-3">
                <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white">
                  {imagenAmpliada.indice + 1} / {imagenAmpliada.elementos.length}
                </div>
                <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-black/40 p-2">
                  {imagenAmpliada.elementos.map((elemento, indice) => (
                    <button
                      key={`${elemento.src}-${indice}`}
                      type="button"
                      onClick={() => setImagenAmpliada((actual) => actual ? { ...actual, indice } : actual)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-16 sm:w-16 ${
                        indice === imagenAmpliada.indice
                          ? "border-white opacity-100"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`${elemento.esVideo ? "Ver video" : "Ver imagen"} ${indice + 1}`}
                    >
                      {elemento.esVideo ? (
                        <>
                          <video src={elemento.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xl text-white">▶</span>
                        </>
                      ) : (
                        <img src={elemento.src} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
